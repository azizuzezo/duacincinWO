package whatsapp

import (
	"crypto/subtle"
	"net/http"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
	"duacincin/server/internal/httpx"
)

// RequireBotSecret gates the inbound webhook with a shared secret instead
// of a session cookie (same precedent as the Midtrans payment webhook) —
// the caller is the WhatsApp engine, never a browser.
func RequireBotSecret(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			got := r.Header.Get("X-Bot-Secret")
			if cfg.WhatsAppBotSecret == "" || subtle.ConstantTimeCompare([]byte(got), []byte(cfg.WhatsAppBotSecret)) != 1 {
				httpx.Error(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// Mount registers the engine webhook, the account's own number
// verification, and the admin status card onto r.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	r.Route("/whatsapp", func(r chi.Router) {
		r.With(RequireBotSecret(cfg)).Post("/inbound", Inbound(deps))

		r.Group(func(r chi.Router) {
			r.Use(auth.RequireAuth(cfg), auth.RequireRole(auth.RoleClient, auth.RoleVendor))
			r.Get("/me", MyWhatsApp(deps))
			r.Post("/me/code", SendWhatsAppCode(deps))
			r.Post("/me/verify", VerifyWhatsAppCode(deps))
		})

		r.Group(func(r chi.Router) {
			r.Use(auth.RequireAuth(cfg), auth.RequireRole(auth.RoleAdmin))
			r.Get("/admin/status", AdminStatus(deps))
			r.Get("/admin/recipients", AdminRecipients(deps))
			r.Get("/admin/sent", AdminSentWhatsApp(deps))
			r.Post("/admin/send", AdminSendWhatsApp(deps))
		})
	})
}
