package auth

import (
	"context"
	"net/http"
	"slices"

	"duacincin/server/internal/config"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/security"
)

type contextKey string

const claimsContextKey contextKey = "session_claims"

// RequireAuth parses the session cookie and rejects the request if it is
// missing or invalid, otherwise attaches the claims to the context.
func RequireAuth(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(SessionCookieName)
			if err != nil {
				httpx.Error(w, http.StatusUnauthorized, "belum login")
				return
			}

			claims, err := security.ParseSessionToken(cfg.JWTSecret, cookie.Value)
			if err != nil {
				httpx.Error(w, http.StatusUnauthorized, "sesi tidak valid atau sudah kedaluwarsa")
				return
			}

			ctx := context.WithValue(r.Context(), claimsContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func claimsFromContext(ctx context.Context) (*security.SessionClaims, bool) {
	claims, ok := ctx.Value(claimsContextKey).(*security.SessionClaims)
	return claims, ok
}

// ClaimsFromContext exposes the authenticated session's claims to other
// feature packages (vendors, chat, admin, ...). Must run behind RequireAuth.
func ClaimsFromContext(ctx context.Context) (*security.SessionClaims, bool) {
	return claimsFromContext(ctx)
}

// RequireRole rejects the request unless the authenticated user's role is
// one of roles. Must be chained after RequireAuth.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := claimsFromContext(r.Context())
			if !ok || !slices.Contains(roles, claims.Role) {
				httpx.Error(w, http.StatusForbidden, "tidak punya akses")
				return
			}
			next.ServeHTTP(w, r.WithContext(r.Context()))
		})
	}
}
