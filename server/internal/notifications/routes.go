package notifications

import (
	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
)

// Mount registers /notifications/* routes onto r, available to any
// authenticated role.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	r.Route("/notifications", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))

		r.Get("/", List(deps))
		r.Get("/unread-count", UnreadCount(deps))
		r.Post("/{id}/read", MarkRead(deps))
		r.Post("/read-all", MarkAllRead(deps))
	})
}
