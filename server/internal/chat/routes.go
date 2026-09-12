package chat

import (
	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
)

// Mount registers /conversations/* routes onto r, all requiring a session.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	r.Route("/conversations", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))

		r.With(auth.RequireRole(auth.RoleClient)).Post("/vendor/{vendorID}", StartVendorChat(deps))
		r.With(auth.RequireRole(auth.RoleClient)).Post("/consultation", StartConsultation(deps))

		r.Get("/", ListConversations(deps))
		r.Get("/{id}/messages", ListMessages(deps))
		r.Post("/{id}/messages", SendMessage(deps))
		r.Post("/{id}/read", MarkRead(deps))
	})
}
