package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/repository"
)

// chatNotifyEvery limits WhatsApp chat notifications: at most one per
// conversation per recipient in this window, so a burst of messages is one
// notification, not a stream of them. The web chat holds everything.
const chatNotifyEvery = 15 * time.Minute

// NotifyNewMessage implements chat.Notifier: called right after a chat
// message is stored, it tells the other side of a client-vendor chat over
// WhatsApp who wrote, what, and where to reply (the web chat). WhatsApp is
// notification only: nothing sent to the official number is relayed back.
func (d *Deps) NotifyNewMessage(ctx context.Context, conv *repository.Conversation, senderUserID string, msg *repository.Message) {
	if conv.Type != repository.ConversationTypeVendorChat || conv.VendorID == nil {
		return
	}
	recipientID := conv.ClientID
	if senderUserID == conv.ClientID {
		recipientID = *conv.VendorID
	}

	link, err := d.Links.GetByUserID(ctx, recipientID)
	if err != nil || link.LinkState != repository.WhatsAppLinkStateLinked {
		return
	}
	if ok, err := d.Limiter.Allow(ctx, "wa-chat-notify:"+recipientID+":"+conv.ID, "wa_chat_notify", 1, chatNotifyEvery); err != nil || !ok {
		return
	}

	d.deliver(ctx, link.JID, chatNotifyText(
		d.participantLabel(ctx, conv, msg.SenderID),
		messagePreview(msg),
		d.conversationURL(conv, recipientID),
	))
}

// chatNotifyText is the WhatsApp notification for a new chat message.
func chatNotifyText(sender, preview, replyURL string) string {
	return fmt.Sprintf(`🔔 *Pesan baru di DuaCincin*

Dari: *%s*
%s

Balas di sini:
%s

_Notifikasi otomatis, tidak perlu dibalas lewat WhatsApp._`, sender, preview, replyURL)
}

// messagePreview is the message as shown in a notification: quoted text
// (shortened), or what kind of attachment it is.
func messagePreview(msg *repository.Message) string {
	if msg.Flagged {
		// Contact details stay on the platform: never copy them to WhatsApp.
		return "_(Pesan ini hanya bisa dibaca di DuaCincin.)_"
	}
	body := strings.Join(strings.Fields(msg.Body), " ")
	if r := []rune(body); len(r) > 300 {
		body = strings.TrimSpace(string(r[:300])) + "…"
	}
	note := ""
	if msg.AttachmentURL != nil {
		k := ""
		if msg.AttachmentType != nil {
			k = *msg.AttachmentType
		}
		switch {
		case strings.HasPrefix(k, "image"):
			note = "📷 Foto"
		case strings.HasPrefix(k, "video"):
			note = "🎥 Video"
		case strings.HasPrefix(k, "audio"):
			note = "🎤 Pesan suara"
		default:
			note = "📎 Lampiran"
		}
	}
	switch {
	case body != "" && note != "":
		return note + "\n\"" + body + "\""
	case body != "":
		return "\"" + body + "\""
	default:
		return note
	}
}

// conversationURL is the web chat for userID's side of conv.
func (d *Deps) conversationURL(conv *repository.Conversation, userID string) string {
	base := strings.TrimRight(d.Cfg.WebBaseURL, "/")
	if conv.VendorID != nil && *conv.VendorID == userID {
		return base + "/vendor/messages/" + conv.ID
	}
	return base + "/client/messages/" + conv.ID
}

// participantLabel is the name shown to the *other* side — vendor's
// business_name or client's full_name — never a phone number.
func (d *Deps) participantLabel(ctx context.Context, conv *repository.Conversation, senderID string) string {
	if conv.VendorID != nil && senderID == *conv.VendorID {
		if profile, err := d.Vendors.GetByUserID(ctx, senderID); err == nil {
			return profile.BusinessName
		}
		return "Vendor"
	}
	if u, err := d.Users.GetByID(ctx, senderID); err == nil {
		return u.FullName
	}
	return "Klien"
}

// deliver pushes an outbound WhatsApp message to the whatsapp-bot/
// process's /deliver endpoint. Best-effort: a delivery failure only logs,
// since the message is already safely stored in the conversation either way.
// deliverImage is deliver with a picture (a public https URL) on top, the
// text becoming its caption. Without the shared engine it sends the text.
func (d *Deps) deliverImage(ctx context.Context, jid, text, imageURL string) {
	if d.Cfg.WARelayURL == "" {
		d.deliver(ctx, jid, text)
		return
	}
	if err := d.relaySend(ctx, jid, text, imageURL); err != nil {
		log.Printf("whatsapp relay: %v", err)
	}
}

func (d *Deps) deliver(ctx context.Context, jid, text string) {
	// Shared engine (dc-wa-engine through the invitation product's relay).
	if d.Cfg.WARelayURL != "" {
		d.deliverViaRelay(ctx, jid, text)
		return
	}
	if d.Cfg.WhatsAppBotCallbackURL == "" {
		if d.Cfg.AppEnv == "development" {
			// Local development and e2e: show what would have been sent.
			log.Printf("[DEV] whatsapp ke %s: %q", jid, text)
			return
		}
		log.Printf("whatsapp deliver: WHATSAPP_BOT_CALLBACK_URL not set, dropping message to %s", jid)
		return
	}

	payload, err := json.Marshal(map[string]string{"jid": jid, "text": text})
	if err != nil {
		return
	}
	url := strings.TrimRight(d.Cfg.WhatsAppBotCallbackURL, "/") + "/deliver"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Bot-Secret", d.Cfg.WhatsAppBotSecret)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("whatsapp deliver: %v", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		log.Printf("whatsapp deliver: bot returned status %d", resp.StatusCode)
	}
}

// deliverViaRelay queues the message on the shared dc-wa-engine.
// Best-effort like the bot path: the message is already stored in the
// conversation either way.
func (d *Deps) deliverViaRelay(ctx context.Context, jid, text string) {
	if err := d.relaySend(ctx, jid, text, ""); err != nil {
		log.Printf("whatsapp relay: %v", err)
	}
}

// errOfficialDown: the official number is not linked to the engine.
var errOfficialDown = errors.New("official WhatsApp number is disconnected")

// sendNow sends text to phone (628...) and reports whether it was accepted,
// for the cases where the caller must know (a verification code).
func (d *Deps) sendNow(ctx context.Context, phone, text string) error {
	jid := phone + "@s.whatsapp.net"
	if d.Cfg.WARelayURL == "" {
		if d.Cfg.WhatsAppBotCallbackURL == "" {
			return errors.New("no WhatsApp transport configured")
		}
		d.deliver(ctx, jid, text)
		return nil
	}
	return d.relaySend(ctx, jid, text, "")
}

// relaySend posts one message to the invitation product's ?action=relay,
// which queues it on dc-wa-engine for the official number.
func (d *Deps) relaySend(ctx context.Context, jid, text, imageURL string) error {
	body := map[string]string{"jid": jid, "text": text}
	if imageURL != "" {
		// The engine sends it as a WhatsApp image with text as the caption;
		// an engine that predates images just sends the text.
		body["image_url"] = imageURL
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, d.Cfg.WARelayURL, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Bot-Secret", d.Cfg.WhatsAppBotSecret)
	resp, err := relayClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusConflict {
		d.alertOfficialDown(context.WithoutCancel(ctx))
		return errOfficialDown
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("relay status %d", resp.StatusCode)
	}
	return nil
}

// alertOfficialDown tells every admin, at most once an hour, that the
// official number dropped, so it is re-linked before people notice.
func (d *Deps) alertOfficialDown(ctx context.Context) {
	if d.Notifications == nil {
		return
	}
	if ok, err := d.Limiter.Allow(ctx, "wa-official-down", "wa_official_down_alert", 1, time.Hour); err != nil || !ok {
		return
	}
	staff, err := d.Users.ListStaff(ctx)
	if err != nil {
		return
	}
	link := "/internal/admin/dashboard"
	for _, u := range staff {
		if u.Role != auth.RoleAdmin {
			continue
		}
		_ = d.Notifications.Create(ctx, u.ID, "whatsapp_down", "WhatsApp DuaCincin terputus",
			"Nomor resmi tidak terhubung, jadi pesan chat dan kode verifikasi tidak terkirim ke WhatsApp. Hubungkan ulang dari beranda admin.", &link)
	}
}

var relayClient = &http.Client{Timeout: 15 * time.Second}
