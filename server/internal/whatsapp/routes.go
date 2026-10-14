package whatsapp

import (
	"crypto/subtle"
	"net/http"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/config"
	"duacincin/server/internal/httpx"
)

// RequireBotSecret gates the inbound webhook with a shared secret instead
// of a session cookie (same precedent as the Midtrans payment webhook) —
// the caller is the whatsapp-bot/ process, never a browser.
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

// Mount registers the bot-facing webhook onto r.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	r.Route("/whatsapp", func(r chi.Router) {
		r.Use(RequireBotSecret(cfg))
		r.Post("/inbound", Inbound(deps))
	})
}
