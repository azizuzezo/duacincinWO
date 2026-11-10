package invitationlink

import (
	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
)

// Mount registers the Client-only invitation link routes onto r.
//
//	POST /invitation-link/handoff  {bride?, groom?} -> {url, expires_at, guests}
//	POST /invitation-link/sync                      -> {guests_added, guests} (server to server)
//	GET  /invitation-link/status                    -> StatusResponse
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	r.Route("/invitation-link", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))
		r.Use(auth.RequireRole(auth.RoleClient))

		r.Post("/handoff", Handoff(deps))
		r.Post("/sync", SyncGuests(deps))
		r.Get("/status", Status(deps))
	})
}
