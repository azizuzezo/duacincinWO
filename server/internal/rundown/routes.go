package rundown

import (
	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
)

// Mount registers /rundown/* routes onto r, restricted to Clients.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	r.Route("/rundown", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))
		r.Use(auth.RequireRole(auth.RoleClient))

		r.Get("/", ListItems(deps))
		r.Post("/", CreateItem(deps))
		r.Patch("/{id}", UpdateItem(deps))
		r.Delete("/{id}", DeleteItem(deps))
	})
}
