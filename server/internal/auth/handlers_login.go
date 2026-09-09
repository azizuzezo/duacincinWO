package auth

import (
	"net/http"
	"slices"
	"strings"

	"duacincin/server/internal/httpx"
	"duacincin/server/internal/security"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

const genericLoginError = "email atau password salah"

// Login returns a handler that authenticates against one of allowedRoles.
// Client/Vendor logins each pass a single role; the internal login page
// (Admin/Wedding Consultant) passes both of those roles.
func Login(deps *Deps, allowedRoles ...string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req loginRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))

		user, err := deps.Users.GetByEmail(r.Context(), req.Email)
		if err != nil || !slices.Contains(allowedRoles, user.Role) {
			// Same generic error whether the account doesn't exist or has
			// the wrong role, so login never leaks which is the case.
			httpx.Error(w, http.StatusUnauthorized, genericLoginError)
			return
		}

		if user.IsLocked() {
			httpx.Error(w, http.StatusTooManyRequests, "akun terkunci sementara karena terlalu banyak percobaan gagal, coba lagi dalam 15 menit")
			return
		}

		if user.IsBlocked() {
			httpx.Error(w, http.StatusForbidden, "akun ini ditangguhkan/dinonaktifkan karena pelanggaran Perjanjian Kemitraan — hubungi dukungan DuaCincin")
			return
		}

		if !security.VerifyPassword(user.PasswordHash, req.Password) {
			locked, lockErr := deps.Users.RegisterFailedLogin(r.Context(), user.ID)
			if lockErr == nil && locked {
				httpx.Error(w, http.StatusTooManyRequests, "akun terkunci sementara karena terlalu banyak percobaan gagal, coba lagi dalam 15 menit")
				return
			}
			httpx.Error(w, http.StatusUnauthorized, genericLoginError)
			return
		}

		if err := deps.Users.ResetFailedLogin(r.Context(), user.ID); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		token, err := security.IssueSessionToken(deps.Cfg.JWTSecret, user.ID, user.Role)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		setSessionCookie(w, deps.Cfg, token)

		httpx.JSON(w, http.StatusOK, userResponse(user))
	}
}
