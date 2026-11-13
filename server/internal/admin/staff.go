package admin

import (
	"errors"
	"net/http"
	"net/mail"
	"slices"
	"strings"
	"time"

	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/security"
)

// Staff management: an admin adds new admins and wedding consultants
// ("karyawan"). There is no public sign-up for either role, so this and the
// cmd/create-staff bootstrap CLI are the only ways such accounts exist.

const minStaffPasswordLength = 8

type staffDTO struct {
	ID            string    `json:"id"`
	Email         string    `json:"email"`
	FullName      string    `json:"full_name"`
	Role          string    `json:"role"`
	AccountStatus string    `json:"account_status"`
	CreatedAt     time.Time `json:"created_at"`
}

func toStaffDTO(u *repository.User) staffDTO {
	return staffDTO{ID: u.ID, Email: u.Email, FullName: u.FullName, Role: u.Role, AccountStatus: u.AccountStatus, CreatedAt: u.CreatedAt}
}

func listStaff(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		users, err := deps.Users.ListStaff(r.Context())
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]staffDTO, 0, len(users))
		for _, u := range users {
			out = append(out, toStaffDTO(u))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

type createStaffRequest struct {
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
	Password string `json:"password"`
}

func createStaff(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createStaffRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		req.Email = strings.ToLower(strings.TrimSpace(req.Email))
		req.FullName = strings.TrimSpace(req.FullName)
		if _, err := mail.ParseAddress(req.Email); err != nil || !strings.Contains(req.Email, "@") {
			httpx.Error(w, http.StatusBadRequest, "email tidak valid")
			return
		}
		if req.FullName == "" {
			httpx.Error(w, http.StatusBadRequest, "nama lengkap wajib diisi")
			return
		}
		if !slices.Contains(repository.StaffRoles, req.Role) {
			httpx.Error(w, http.StatusBadRequest, "peran harus admin atau wedding_consultant")
			return
		}
		if len(req.Password) < minStaffPasswordLength {
			httpx.Error(w, http.StatusBadRequest, "password minimal 8 karakter")
			return
		}
		hash, err := security.HashPassword(req.Password)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		u, err := deps.Users.Create(r.Context(), req.Email, hash, req.Role, req.FullName)
		if errors.Is(err, repository.ErrDuplicateEmail) {
			httpx.Error(w, http.StatusConflict, "email ini sudah terdaftar")
			return
		}
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		logAction(deps, r, "staff.create", "user", u.ID, map[string]any{"email": u.Email, "role": u.Role})
		httpx.JSON(w, http.StatusCreated, toStaffDTO(u))
	}
}
