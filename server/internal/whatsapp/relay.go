package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"duacincin/server/internal/repository"
)

// NotifyNewMessage implements chat.Notifier — called by chat.SendMessage
// (the web/app path) right after a message is persisted and broadcast, so
// the WhatsApp side gets it too. RelayNewMessage below is the same logic,
// reused for messages that originate from WhatsApp itself.
func (d *Deps) NotifyNewMessage(ctx context.Context, conv *repository.Conversation, senderUserID string, msg *repository.Message) {
	d.RelayNewMessage(ctx, conv, senderUserID, msg)
}

// RelayNewMessage forwards msg to the *other* participant of conv over
// WhatsApp, if they have a linked phone. It never leaks real numbers —
// only the sender's display name is shown — and never delivers a message
// into a thread the recipient isn't currently focused on; it only nudges
// them to switch instead, so no content leaks into the wrong conversation.
func (d *Deps) RelayNewMessage(ctx context.Context, conv *repository.Conversation, senderUserID string, msg *repository.Message) {
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

	body := msg.Body
	if body == "" && msg.AttachmentURL != nil {
		body = "[lampiran gambar]"
	}
	senderLabel := d.participantLabel(ctx, conv, msg.SenderID)

	switch {
	case link.ActiveConversationID != nil && *link.ActiveConversationID == conv.ID:
		d.deliver(ctx, link.JID, fmt.Sprintf("%s: %s", senderLabel, body))

	case link.ActiveConversationID == nil && link.PendingMenu == nil:
		if err := d.Links.SetActiveConversation(ctx, link.ID, &conv.ID); err != nil {
			return
		}
		d.deliver(ctx, link.JID, fmt.Sprintf("Pesan baru dari %s lewat DuaCincin:\n%s", senderLabel, body))

	default:
		d.deliver(ctx, link.JID, "Ada pesan baru di percakapan lain. Ketik 'menu' untuk pindah.")
	}
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
func (d *Deps) deliver(ctx context.Context, jid, text string) {
	if d.Cfg.WhatsAppBotCallbackURL == "" {
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
