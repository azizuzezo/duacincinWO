package vendors

import (
	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
)

// Mount registers vendor-profile and public-directory routes onto r.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	// Public directory and vendor profile detail — no auth required. Vendor
	// portfolios are fully open to browse; only booking and chat require an
	// account (product decision, see engineering.md).
	r.Get("/vendors", Directory(deps))
	r.Get("/vendors/{id}", VendorDetail(deps))
	r.Get("/vendors/{id}/reviews", ListVendorReviews(deps))
	r.Get("/vendors/{id}/packages", ListVendorPackages(deps))

	r.Route("/vendor", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))
		r.Use(auth.RequireRole(auth.RoleVendor))

		r.Put("/profile", UpsertProfile(deps))
		r.Get("/profile/me", MyProfile(deps))
		r.Post("/profile/name-change", RequestNameChange(deps))
		r.Post("/portfolio", UploadPortfolio(deps))
		r.Delete("/portfolio/{id}", DeletePortfolio(deps))
		r.Get("/payouts", ListMyPayouts(deps))
		r.Get("/packages", ListMyPackages(deps))
		r.Post("/packages", CreatePackage(deps))
		r.Put("/packages/{id}", UpdatePackage(deps))
		r.Delete("/packages/{id}", DeletePackage(deps))
	})
}
