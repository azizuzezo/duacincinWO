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
		r.Post("/client/login", Login(deps, RoleClient))

		r.Post("/vendor/register", Register(deps, RoleVendor, repository.AgreementTypeVendorPartnership))
		r.Post("/vendor/login", Login(deps, RoleVendor))

		// Admin & Wedding Consultant: no public registration, accounts are
		// created manually by an Admin (PRD §8.10).
		r.Post("/internal/login", Login(deps, RoleAdmin, RoleWeddingConsultant))

		r.Post("/forgot-password", ForgotPassword(deps))
		r.Post("/verify-otp", VerifyOTP(deps))
		r.Post("/reset-password", ResetPassword(deps))

		r.Post("/logout", Logout(deps))

		r.Group(func(r chi.Router) {
			r.Use(RequireAuth(deps.Cfg))
			r.Get("/me", Me(deps))
		})
	})
}
