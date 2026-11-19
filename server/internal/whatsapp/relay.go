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
		// Another thread is in focus: still show who wrote and what, so the
		// recipient knows at once whose message it is, and how to answer it.
		d.deliver(ctx, link.JID, fmt.Sprintf("*%s* · #%s\n%s\n\n_Untuk membalas %s, ketik 'menu' lalu pilih percakapannya._",
			senderLabel, convCode(conv.ID), body, senderLabel))
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
	// Shared engine (dc-wa-engine through the invitation product's relay).
	if d.Cfg.WARelayURL != "" {
		d.deliverViaRelay(ctx, jid, text)
		return
	}
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

// deliverViaRelay queues the message on the shared dc-wa-engine.
// Best-effort like the bot path: the message is already stored in the
// conversation either way.
func (d *Deps) deliverViaRelay(ctx context.Context, jid, text string) {
	if err := d.relaySend(ctx, jid, text); err != nil {
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
	return d.relaySend(ctx, jid, text)
}

// relaySend posts one message to the invitation product's ?action=relay,
// which queues it on dc-wa-engine for the official number.
func (d *Deps) relaySend(ctx context.Context, jid, text string) error {
	payload, err := json.Marshal(map[string]string{"jid": jid, "text": text})
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

// convCode is a short, stable tag for a conversation shown in WhatsApp.
func convCode(id string) string {
	c := strings.ToUpper(strings.ReplaceAll(id, "-", ""))
	if len(c) > 4 {
		c = c[:4]
	}
	return c
}
