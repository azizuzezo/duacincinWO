package auth

import (
	"net/http"

	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

type userDTO struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	FullName string `json:"full_name"`
}

func userResponse(u *repository.User) userDTO {
	return userDTO{ID: u.ID, Email: u.Email, Role: u.Role, FullName: u.FullName}
}

func Logout(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		clearSessionCookie(w, deps.Cfg)
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "berhasil keluar"})
	}
}

// Me returns the currently authenticated user. Must run behind RequireAuth.
func Me(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := claimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		user, err := deps.Users.GetByID(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		httpx.JSON(w, http.StatusOK, userResponse(user))
	}
}
