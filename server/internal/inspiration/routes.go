package inspiration

import (
	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
)

// Mount registers /inspiration (public) and /admin/inspiration (Admin-only
// upload/delete) routes onto r.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	r.Get("/inspiration", List(deps))
	r.Get("/inspiration/categories", Categories(deps))

	r.Route("/admin/inspiration", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))
		r.Use(auth.RequireRole(auth.RoleAdmin))

		r.Post("/", Upload(deps))
		r.Delete("/{id}", Delete(deps))
	})
}
