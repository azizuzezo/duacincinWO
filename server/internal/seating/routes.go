package seating

import (
	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
)

// Mount registers /seating/* routes onto r, restricted to Clients.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	r.Route("/seating", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))
		r.Use(auth.RequireRole(auth.RoleClient))

		r.Get("/board", GetBoard(deps))
		r.Post("/tables", CreateTable(deps))
		r.Patch("/tables/{id}", UpdateTable(deps))
		r.Delete("/tables/{id}", DeleteTable(deps))
		r.Post("/assign", AssignGuest(deps))
		r.Delete("/assign/{guestId}", UnassignGuest(deps))
	})
}
