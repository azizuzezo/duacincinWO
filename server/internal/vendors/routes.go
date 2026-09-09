package vendors

import (
	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
)

// Mount registers vendor-profile and public-directory routes onto r.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	// Public directory — no auth required (PRD §8.1/§8.3).
	r.Get("/vendors", Directory(deps))

	r.Route("/vendor", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))
		r.Use(auth.RequireRole(auth.RoleVendor))

		r.Put("/profile", UpsertProfile(deps))
		r.Get("/profile/me", MyProfile(deps))
		r.Post("/portfolio", UploadPortfolio(deps))
	})

	// Unlocked vendor detail — any authenticated user (PRD §8.3: "setelah
	// Client login"); Vendor/staff roles reading it causes no harm.
	r.Group(func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))
		r.Get("/vendors/{id}", VendorDetail(deps))
	})
}
