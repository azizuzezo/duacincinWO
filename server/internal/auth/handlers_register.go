package auth

import (
	"net/http"
	"regexp"
	"strings"
	"time"

	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/security"
)

var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

const (
	registerRateLimitPerIPPerHour = 5
	minPasswordLength             = 8
)

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

// Register returns a handler that creates a user with a fixed role
// ("client" or "vendor" — PRD §8.2 keeps these as two separate flows).
func Register(deps *Deps, role string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req registerRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}

		req.Email = strings.TrimSpace(strings.ToLower(req.Email))
		req.FullName = strings.TrimSpace(req.FullName)

		if !emailRe.MatchString(req.Email) {
			httpx.Error(w, http.StatusBadRequest, "email tidak valid")
			return
		}
		if len(req.Password) < minPasswordLength {
			httpx.Error(w, http.StatusBadRequest, "password minimal 8 karakter")
			return
		}

		ok, err := deps.Limiter.Allow(r.Context(), "register:"+clientIP(r), "register", registerRateLimitPerIPPerHour, time.Hour)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !ok {
			httpx.Error(w, http.StatusTooManyRequests, "terlalu banyak percobaan daftar, coba lagi nanti")
			return
		}

		hash, err := security.HashPassword(req.Password)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		user, err := deps.Users.Create(r.Context(), req.Email, hash, role, req.FullName)
		if err != nil {
			if err == repository.ErrDuplicateEmail {
				httpx.Error(w, http.StatusConflict, "email sudah terdaftar")
				return
			}
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		token, err := security.IssueSessionToken(deps.Cfg.JWTSecret, user.ID, user.Role)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		setSessionCookie(w, deps.Cfg, token)

		httpx.JSON(w, http.StatusCreated, userResponse(user))
	}
}
