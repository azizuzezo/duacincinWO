package whatsapp

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/chat"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

type inboundRequest struct {
	JID   string `json:"jid"`
	Phone string `json:"phone"`
	Text  string `json:"text"`
}

type inboundResponse struct {
	Reply string `json:"reply"`
}

// Inbound is the one webhook the WhatsApp engine calls for every text that
// reaches the official number. A number is recognised only once its owner
// has verified it from their DuaCincin account (a code sent to this number);
// there is no linking from inside WhatsApp any more.
func Inbound(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req inboundRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil || req.Phone == "" || req.JID == "" {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}
		ctx := r.Context()
		text := strings.TrimSpace(req.Text)

		link, err := deps.Links.GetByPhone(ctx, req.Phone)
		if err != nil && !errors.Is(err, repository.ErrNotFound) {
			httpx.Error(w, http.StatusInternalServerError, "internal error")
			return
		}
		if link == nil || link.LinkState != repository.WhatsAppLinkStateLinked || link.UserID == nil {
			httpx.JSON(w, http.StatusOK, inboundResponse{Reply: deps.unknownSenderReply(ctx, req.Phone, text, link != nil)})
			return
		}
		// Refresh the JID: WhatsApp's addressing for a number can change.
		if link.JID != req.JID {
			if fresh, err := deps.Links.GetOrCreate(ctx, req.Phone, req.JID); err == nil {
				link = fresh
			}
		}
		httpx.JSON(w, http.StatusOK, inboundResponse{Reply: deps.handleMessage(ctx, link, text)})
	}
}

// unknownSenderReply answers a number no account has verified. The official
// number is shared with the invitation product, so invitation guests (who
// never mention DuaCincin WO) get no reply at all; someone clearly trying
// to reach WO is told how to verify, at most once every 6 hours.
func (d *Deps) unknownSenderReply(ctx context.Context, phone, text string, seenBefore bool) string {
	if !seenBefore && !wantsWO(text) {
		return ""
	}
	if ok, err := d.Limiter.Allow(ctx, "wa-unknown:"+phone, "wa_unknown_reply", 1, 6*time.Hour); err != nil || !ok {
		return ""
	}
	return fmt.Sprintf(`Halo! Nomor ini belum terhubung ke akun DuaCincin.

Untuk chat dengan vendor atau klien lewat WhatsApp:
1. Masuk ke %s
2. Isi nomor WhatsApp ini saat diminta
3. Masukkan kode verifikasi yang kami kirim ke sini

Setelah terverifikasi, pesan akan diteruskan otomatis ke WhatsApp ini.`, webHost(d.Cfg.WebBaseURL))
}

func (d *Deps) handleMessage(ctx context.Context, link *repository.WhatsAppLink, text string) string {
	if strings.EqualFold(text, "menu") {
		return d.showMainMenu(ctx, link)
	}
	return d.handleLinked(ctx, link, text)
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
		return ""
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
		rate := v.EffectiveCommissionRate()
		label := fmt.Sprintf("%s (%s) — Rp%s–Rp%s", v.BusinessName, v.City, formatRupiah(repository.CustomerPrice(v.PriceMin, rate)), formatRupiah(repository.CustomerPrice(v.PriceMax, rate)))
		options = append(options, menuOption{Label: label, Value: v.UserID})
	}
	if err := d.Links.SetPendingMenu(ctx, link.ID, pendingMenu{Kind: menuKindVendor, Options: options}); err != nil {
		return "Terjadi kesalahan, coba lagi."
	}
	return renderMenu("Pilih vendor:", options)
}

func (d *Deps) showConversationPicker(ctx context.Context, link *repository.WhatsAppLink, vendorUser *repository.User) string {
	all, err := d.Chat.ListForVendor(ctx, vendorUser.ID)
	if err != nil {
		return "Terjadi kesalahan, coba lagi."
	}
	// Only chats with couples: the WhatsApp relay is for those, and a chat
	// with Admin stays in the web app.
	var convs []repository.Conversation
	for _, c := range all {
		if c.Type == repository.ConversationTypeVendorChat {
			convs = append(convs, c)
		}
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
	if errors.Is(err, repository.ErrConversationClosed) {
		return "Sesi chat ini sudah ditutup, jadi pesanmu belum diteruskan. Buka kembali sesinya di duacincin.id, atau ketik 'menu' untuk memilih percakapan lain."
	}
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

func messagePayload(m *repository.Message) map[string]any {
	return map[string]any{
		"id":         m.ID,
		"sender_id":  m.SenderID,
		"body":       m.Body,
		"flagged":    m.Flagged,
		"created_at": m.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

var woTrigger = regexp.MustCompile(`(?i)\b(duacincin|dua cincin|duacincin\.id|hubungkan|tautkan|daftar wo)\b`)

// wantsWO tells a first message meant for DuaCincin WO (an account email,
// or naming DuaCincin) from an invitation guest's reply.
func wantsWO(text string) bool {
	t := strings.TrimSpace(text)
	return looksLikeEmail(t) || woTrigger.MatchString(t)
}
