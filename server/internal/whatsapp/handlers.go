package whatsapp

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/chat"
	"duacincin/server/internal/email"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/security"
)

const linkOTPTTL = 5 * time.Minute

type inboundRequest struct {
	JID   string `json:"jid"`
	Phone string `json:"phone"`
	Text  string `json:"text"`
}

type inboundResponse struct {
	Reply string `json:"reply"`
}

// Inbound is the one webhook whatsapp-bot/ calls for every inbound
// WhatsApp text message. It never has any WhatsApp-specific behavior of
// its own beyond bookkeeping the link row — all decisions are made by
// handleMessage's state machine.
func Inbound(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req inboundRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil || req.Phone == "" || req.JID == "" {
			httpx.Error(w, http.StatusBadRequest, "invalid body")
			return
		}

		link, err := deps.Links.GetOrCreate(r.Context(), req.Phone, req.JID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "internal error")
			return
		}

		reply := deps.handleMessage(r.Context(), link, strings.TrimSpace(req.Text))
		httpx.JSON(w, http.StatusOK, inboundResponse{Reply: reply})
	}
}

func (d *Deps) handleMessage(ctx context.Context, link *repository.WhatsAppLink, text string) string {
	// A pasted email always restarts the linking flow, even mid-OTP —
	// simplest recovery path if the user fat-fingered the wrong address.
	if link.LinkState != repository.WhatsAppLinkStateLinked && looksLikeEmail(text) {
		return d.handleEmailStep(ctx, link, text)
	}

	if link.LinkState == repository.WhatsAppLinkStateLinked && strings.EqualFold(text, "menu") {
		return d.showMainMenu(ctx, link)
	}

	switch link.LinkState {
	case repository.WhatsAppLinkStateAwaitingOTP:
		return d.handleOTPStep(ctx, link, text)
	case repository.WhatsAppLinkStateLinked:
		return d.handleLinked(ctx, link, text)
	default: // awaiting_email
		return d.handleEmailStep(ctx, link, text)
	}
}

func (d *Deps) handleEmailStep(ctx context.Context, link *repository.WhatsAppLink, text string) string {
	if !looksLikeEmail(text) {
		return "Selamat datang di DuaCincin! Untuk menghubungkan WhatsApp ini ke akun kamu, balas pesan ini dengan alamat email akun DuaCincin kamu."
	}
	email := strings.ToLower(text)

	ok, err := d.Limiter.Allow(ctx, "whatsapp-link:request:"+link.Phone, "whatsapp_link_request", 5, 15*time.Minute)
	if err != nil || !ok {
		return "Terlalu banyak percobaan, coba lagi dalam beberapa menit."
	}

	user, err := d.Users.GetByEmail(ctx, email)
	if err != nil {
		return "Email tidak ditemukan. Pastikan kamu sudah punya akun DuaCincin dengan email tersebut, lalu kirim lagi emailnya."
	}

	code, err := security.GenerateOTP()
	if err != nil {
		return "Terjadi kesalahan, coba lagi."
	}
	codeHash := security.HashOTP(d.Cfg.OTPHMACSecret, code)
	if err := d.OTP.Create(ctx, user.ID, repository.PurposePhoneLink, codeHash, linkOTPTTL); err != nil {
		return "Terjadi kesalahan, coba lagi."
	}
	d.sendLinkOTPEmail(ctx, user.Email, code)

	if err := d.Links.SetAwaitingOTP(ctx, link.ID, email, user.ID); err != nil {
		return "Terjadi kesalahan, coba lagi."
	}
	return "Kode OTP sudah dikirim ke email kamu. Balas pesan ini dengan kode 6 digit tersebut (berlaku 5 menit)."
}

func (d *Deps) handleOTPStep(ctx context.Context, link *repository.WhatsAppLink, text string) string {
	if link.PendingOTPUserID == nil {
		return d.handleEmailStep(ctx, link, text)
	}

	ok, err := d.Limiter.Allow(ctx, "whatsapp-link:verify:"+link.Phone, "whatsapp_link_verify", 10, 15*time.Minute)
	if err != nil || !ok {
		return "Terlalu banyak percobaan verifikasi, coba lagi nanti."
	}

	const invalidMsg = "Kode OTP salah atau sudah kedaluwarsa. Kirim ulang kodenya, atau balas dengan email untuk mulai ulang."

	otp, err := d.OTP.GetLatestValid(ctx, *link.PendingOTPUserID, repository.PurposePhoneLink)
	if err != nil || !security.VerifyOTP(d.Cfg.OTPHMACSecret, text, otp.CodeHash) {
		return invalidMsg
	}
	_ = d.OTP.MarkConsumed(ctx, otp.ID)

	if err := d.Links.CompleteLink(ctx, link.ID, *link.PendingOTPUserID); err != nil {
		return "Terjadi kesalahan, coba lagi."
	}
	link.UserID = link.PendingOTPUserID
	link.LinkState = repository.WhatsAppLinkStateLinked

	return d.showMainMenu(ctx, link)
}

func (d *Deps) handleLinked(ctx context.Context, link *repository.WhatsAppLink, text string) string {
	if link.PendingMenu != nil {
		return d.handleMenuReply(ctx, link, text)
	}
	if link.ActiveConversationID != nil {
		return d.handleChatMessage(ctx, link, text)
	}
	return d.showMainMenu(ctx, link)
}

// showMainMenu resets the link to idle and shows the role-appropriate
// picker: Clients browse vendor categories, Vendors pick which client
// conversation to focus on.
func (d *Deps) showMainMenu(ctx context.Context, link *repository.WhatsAppLink) string {
	if link.UserID == nil {
		return d.handleEmailStep(ctx, link, "")
	}
	user, err := d.Users.GetByID(ctx, *link.UserID)
	if err != nil {
		return "Terjadi kesalahan, coba lagi."
	}
	_ = d.Links.SetActiveConversation(ctx, link.ID, nil)

	if user.Role == auth.RoleVendor {
		return d.showConversationPicker(ctx, link, user)
	}
	return d.showCategoryMenu(ctx, link)
}

func (d *Deps) showCategoryMenu(ctx context.Context, link *repository.WhatsAppLink) string {
	options := categoryOptions()
	if err := d.Links.SetPendingMenu(ctx, link.ID, pendingMenu{Kind: menuKindCategory, Options: options}); err != nil {
		return "Terjadi kesalahan, coba lagi."
	}
	return renderMenu("Mau cari vendor kategori apa?", options)
}

func (d *Deps) showVendorMenu(ctx context.Context, link *repository.WhatsAppLink, category string) string {
	vendorList, err := d.Vendors.ListApproved(ctx, category, "", 0)
	if err != nil {
		return "Terjadi kesalahan, coba lagi."
	}
	if len(vendorList) == 0 {
		_ = d.Links.SetPendingMenu(ctx, link.ID, nil)
		return "Belum ada vendor tersedia di kategori ini. Ketik 'menu' untuk memilih kategori lain."
	}

	options := make([]menuOption, 0, len(vendorList))
	for _, v := range vendorList {
		label := fmt.Sprintf("%s (%s) — Rp%s–Rp%s", v.BusinessName, v.City, formatRupiah(v.PriceMin), formatRupiah(v.PriceMax))
		options = append(options, menuOption{Label: label, Value: v.UserID})
	}
	if err := d.Links.SetPendingMenu(ctx, link.ID, pendingMenu{Kind: menuKindVendor, Options: options}); err != nil {
		return "Terjadi kesalahan, coba lagi."
	}
	return renderMenu("Pilih vendor:", options)
}

func (d *Deps) showConversationPicker(ctx context.Context, link *repository.WhatsAppLink, vendorUser *repository.User) string {
	convs, err := d.Chat.ListForVendor(ctx, vendorUser.ID)
	if err != nil {
		return "Terjadi kesalahan, coba lagi."
	}
	if len(convs) == 0 {
		_ = d.Links.SetPendingMenu(ctx, link.ID, nil)
		return "Belum ada percakapan dengan klien saat ini. Kamu akan dikabari di sini kalau ada klien baru yang menghubungi."
	}

	options := make([]menuOption, 0, len(convs))
	for _, c := range convs {
		label := "Klien"
		if client, err := d.Users.GetByID(ctx, c.ClientID); err == nil {
			label = client.FullName
		}
		options = append(options, menuOption{Label: label, Value: c.ID})
	}
	if err := d.Links.SetPendingMenu(ctx, link.ID, pendingMenu{Kind: menuKindConversation, Options: options}); err != nil {
		return "Terjadi kesalahan, coba lagi."
	}
	return renderMenu("Pilih percakapan klien:", options)
}

func (d *Deps) handleMenuReply(ctx context.Context, link *repository.WhatsAppLink, text string) string {
	menu, err := parsePendingMenu(link.PendingMenu)
	if err != nil || menu == nil {
		return d.showMainMenu(ctx, link)
	}

	idx, err := strconv.Atoi(text)
	if err != nil || idx < 1 || idx > len(menu.Options) {
		return "Balas dengan salah satu angka pada daftar di atas, atau ketik 'menu' untuk mulai ulang."
	}
	choice := menu.Options[idx-1]

	switch menu.Kind {
	case menuKindCategory:
		return d.showVendorMenu(ctx, link, choice.Value)

	case menuKindVendor:
		conv, err := d.Chat.GetOrCreateVendorChat(ctx, *link.UserID, choice.Value)
		if err != nil {
			return "Terjadi kesalahan, coba lagi."
		}
		if err := d.Links.SetActiveConversation(ctx, link.ID, &conv.ID); err != nil {
			return "Terjadi kesalahan, coba lagi."
		}
		name := choice.Label
		if profile, err := d.Vendors.GetByUserID(ctx, choice.Value); err == nil {
			name = profile.BusinessName
		}
		return fmt.Sprintf("Kamu terhubung dengan %s. Kirim pesanmu di sini, nanti otomatis diteruskan. Ketik 'menu' kapan saja untuk pindah/ganti.", name)

	case menuKindConversation:
		conversationID := choice.Value
		if err := d.Links.SetActiveConversation(ctx, link.ID, &conversationID); err != nil {
			return "Terjadi kesalahan, coba lagi."
		}
		return fmt.Sprintf("Percakapan dengan %s dipilih. Kirim pesanmu di sini.", choice.Label)

	default:
		return d.showMainMenu(ctx, link)
	}
}

func (d *Deps) handleChatMessage(ctx context.Context, link *repository.WhatsAppLink, text string) string {
	if text == "" {
		return ""
	}

	conv, err := d.Chat.GetByID(ctx, *link.ActiveConversationID)
	if err != nil {
		_ = d.Links.SetActiveConversation(ctx, link.ID, nil)
		return d.showMainMenu(ctx, link)
	}

	flagged := chat.ContainsContactInfo(text)
	msg, err := d.Chat.CreateMessage(ctx, conv.ID, *link.UserID, text, flagged, nil, nil, nil)
	if err != nil {
		return "Terjadi kesalahan, coba lagi."
	}
	if flagged && conv.VendorID != nil {
		_ = d.Disputes.Create(ctx, *conv.VendorID, &msg.ID, "Pesan chat terdeteksi berisi kontak eksternal")
	}

	d.Hub.Broadcast(conv.ID, map[string]any{"type": "message.new", "message": messagePayload(msg)})
	d.RelayNewMessage(ctx, conv, *link.UserID, msg)

	// No extra reply text — the bot only echoes something back to the
	// sender when there's an actual instruction/confirmation to give.
	return ""
}

func (d *Deps) sendLinkOTPEmail(ctx context.Context, to, code string) {
	logoURL := ""
	if d.Cfg.PublicAssetBaseURL != "" {
		logoURL = strings.TrimRight(d.Cfg.PublicAssetBaseURL, "/") + "/brand/duacincin-logo.webp"
	}
	subject, html, err := email.RenderPhoneLinkOTPEmail(logoURL, code)
	if err != nil {
		return
	}
	_ = d.Mailer.Send(ctx, to, subject, html)
}

func messagePayload(m *repository.Message) map[string]any {
	return map[string]any{
		"id":         m.ID,
		"sender_id":  m.SenderID,
		"body":       m.Body,
		"flagged":    m.Flagged,
		"created_at": m.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
