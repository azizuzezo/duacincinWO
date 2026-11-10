package auth

import (
	"net/http"

	"duacincin/server/internal/config"
	"duacincin/server/internal/repository"
)

// Exported wrappers so other sign-in methods (internal/googleauth) issue
// exactly the same session cookie and response body as the password login,
// instead of keeping a second copy that could drift.

// UserDTO is the user body every auth endpoint returns.
type UserDTO = userDTO

// SetSessionCookie sets the dc_session cookie, same flags as Login.
func SetSessionCookie(w http.ResponseWriter, cfg *config.Config, token string) {
	setSessionCookie(w, cfg, token)
}

// UserResponse converts a user row into the auth response body.
func UserResponse(u *repository.User) UserDTO {
	return userResponse(u)
}

// ClientIP returns the request IP used for rate-limit keys.
func ClientIP(r *http.Request) string {
	return clientIP(r)
}

// Error messages shared with the password login, so every sign-in method
// tells a locked or sanctioned account the same thing.
const (
	LockedMessage  = "akun terkunci sementara karena terlalu banyak percobaan gagal, coba lagi dalam 15 menit"
	BlockedMessage = "akun ini ditangguhkan/dinonaktifkan karena pelanggaran Perjanjian Kemitraan, hubungi dukungan DuaCincin"
)

// LoginRoles lists every role the shared /auth/login door accepts.
var LoginRoles = []string{RoleClient, RoleVendor, RoleAdmin, RoleWeddingConsultant}
