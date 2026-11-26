package chat

import (
	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
)

// Mount registers /conversations/* routes onto r, all requiring a session.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	r.With(auth.RequireAuth(cfg), auth.RequireRole(auth.RoleClient)).Post("/briefs", SendBrief(deps))

	r.Route("/conversations", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))

		r.With(auth.RequireRole(auth.RoleClient)).Post("/vendor/{vendorID}", StartVendorChat(deps))
		r.With(auth.RequireRole(auth.RoleClient)).Post("/consultation", StartConsultation(deps))
		r.With(auth.RequireRole(auth.RoleAdmin)).Post("/admin-vendor/{vendorID}", StartAdminVendorChat(deps))

		r.Get("/", ListConversations(deps))
		r.Get("/{id}", GetConversation(deps))
		r.Get("/{id}/messages", ListMessages(deps))
		r.Post("/{id}/messages", SendMessage(deps))
		r.Patch("/{id}/messages/{mid}", EditMessage(deps))
		r.Delete("/{id}/messages/{mid}", RetractMessage(deps))
		r.Post("/{id}/attachments", UploadAttachment(deps))
		r.Post("/{id}/attachments/sign", SignAttachment(deps))
		r.Post("/{id}/read", MarkRead(deps))
		r.Post("/{id}/delivered", MarkDeliveredNow(deps))
		r.Post("/{id}/close", CloseSession(deps))
		r.Post("/{id}/reopen", ReopenSession(deps))
	})
}
