package guestlist

import (
	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
)

// Mount registers the public RSVP surface and the Client-only guest list
// management routes onto r.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	// Public, no auth: protected by the token itself + rate limiting.
	r.Route("/rsvp/{token}", func(r chi.Router) {
		r.Get("/", GetRSVPInfo(deps))
		r.Post("/respond", SubmitRSVP(deps))
	})

	r.Route("/guests", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))
		r.Use(auth.RequireRole(auth.RoleClient))

		r.Get("/", ListGuests(deps))
		r.Post("/", CreateGuest(deps))
		r.Patch("/{id}", UpdateGuest(deps))
		r.Delete("/{id}", DeleteGuest(deps))
		r.Get("/rsvp-link", GetMyRSVPLink(deps))
		r.Put("/rsvp-link", UpdateRSVPLink(deps))
	})
}
