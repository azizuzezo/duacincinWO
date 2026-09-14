package booking

import (
	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
)

// Mount registers /bookings/*, /meetings/consultation, and the public
// Midtrans webhook onto r.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	r.Post("/webhooks/midtrans", MidtransWebhook(deps, cfg.MidtransServerKey))

	r.Route("/bookings", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))

		r.With(auth.RequireRole(auth.RoleClient)).Post("/", Create(deps))
		r.With(auth.RequireRole(auth.RoleClient)).Get("/spent-by-category", SpentByCategory(deps))
		r.Get("/", List(deps))
		r.Get("/{id}", Get(deps))
		r.With(auth.RequireRole(auth.RoleVendor)).Post("/{id}/confirm", Confirm(deps))
		r.Post("/{id}/cancel", Cancel(deps))
		r.With(auth.RequireRole(auth.RoleClient)).Post("/{id}/pay/dp", PayDP(deps))
		r.With(auth.RequireRole(auth.RoleClient)).Post("/{id}/pay/full", PayFull(deps))
		r.With(auth.RequireRole(auth.RoleClient)).Post("/{id}/dev-simulate-payment", DevSimulatePayment(deps))
		r.With(auth.RequireRole(auth.RoleClient)).Post("/{id}/complete", Complete(deps))
		r.With(auth.RequireRole(auth.RoleClient)).Post("/{id}/review", SubmitReview(deps))
		r.Get("/{id}/meetings", ListMeetingsForBooking(deps))
		r.Post("/{id}/meetings", CreateTechnicalMeeting(deps))
	})

	r.Route("/meetings/consultation", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))
		r.Use(auth.RequireRole(auth.RoleClient))

		r.Get("/", ListConsultantMeetings(deps))
		r.Post("/", CreateConsultantMeeting(deps))
	})
}
