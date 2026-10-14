// Package whatsapp implements the business logic behind the WhatsApp relay
// channel for vendor_chat: linking a phone to a DuaCincin account, letting a
// Client browse vendors and start a chat, and relaying messages both ways
// between WhatsApp and the existing conversations/messages tables. The
// whatsapp-bot/ Node process is a thin transport layer only — every inbound
// message is handled here (PRD §1.105: Go holds all business logic), and
// outbound deliveries are pushed to that process's /deliver endpoint.
package whatsapp

import (
	"duacincin/server/internal/chat"
	"duacincin/server/internal/config"
	"duacincin/server/internal/email"
	"duacincin/server/internal/ratelimit"
	"duacincin/server/internal/repository"
)

type Deps struct {
	Links    *repository.WhatsAppLinkRepo
	Chat     *repository.ChatRepo
	Vendors  *repository.VendorRepo
	Users    *repository.UserRepo
	OTP      *repository.OTPRepo
	Disputes *repository.DisputeRepo
	Limiter  *ratelimit.Limiter
	Hub      *chat.Hub
	Mailer   *email.Client
	Cfg      *config.Config
}

func NewDeps(
	links *repository.WhatsAppLinkRepo,
	chatRepo *repository.ChatRepo,
	vendors *repository.VendorRepo,
	users *repository.UserRepo,
	otp *repository.OTPRepo,
	disputes *repository.DisputeRepo,
	limiter *ratelimit.Limiter,
	hub *chat.Hub,
	mailer *email.Client,
	cfg *config.Config,
) *Deps {
	return &Deps{
		Links: links, Chat: chatRepo, Vendors: vendors, Users: users, OTP: otp,
		Disputes: disputes, Limiter: limiter, Hub: hub, Mailer: mailer, Cfg: cfg,
	}
}

// var _ chat.Notifier = (*Deps)(nil) documents (and compile-checks) that
// Deps implements chat.Notifier — see relay.go for NotifyNewMessage.
var _ chat.Notifier = (*Deps)(nil)
