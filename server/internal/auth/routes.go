package auth

import (
	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/repository"
)

const (
	RoleClient            = "client"
	RoleVendor            = "vendor"
	RoleAdmin             = "admin"
	RoleWeddingConsultant = "wedding_consultant"
)

// Mount registers every /auth/* route (PRD §8.2) onto r.
func Mount(r chi.Router, deps *Deps) {
	r.Route("/auth", func(r chi.Router) {
		r.Post("/client/register", Register(deps, RoleClient, repository.AgreementTypeClientTOS))
		r.Post("/vendor/register", Register(deps, RoleVendor, repository.AgreementTypeVendorPartnership))

		// One login door for every role (client, vendor, admin, wedding
		// consultant) — email is globally unique across roles (see
		// engineering.md), so the handler can look the account up and issue
		// the right session without the caller needing to know the role
		// upfront. Admin & Wedding Consultant still have no public
		// registration; only login is shared (PRD §8.10).
		r.Post("/login", Login(deps, RoleClient, RoleVendor, RoleAdmin, RoleWeddingConsultant))

		r.Post("/forgot-password", ForgotPassword(deps))
		r.Post("/verify-otp", VerifyOTP(deps))
		r.Post("/reset-password", ResetPassword(deps))

		r.Post("/logout", Logout(deps))

		r.Group(func(r chi.Router) {
			r.Use(RequireAuth(deps.Cfg))
			r.Get("/me", Me(deps))
			r.Post("/change-password", ChangePassword(deps))
		})
	})
}
