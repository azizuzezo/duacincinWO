package googleauth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/ratelimit"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/security"
)

type userStore interface {
	GetByEmail(ctx context.Context, email string) (*repository.User, error)
	Create(ctx context.Context, email, passwordHash, role, fullName string) (*repository.User, error)
	ResetFailedLogin(ctx context.Context, id string) error
}

type agreementStore interface {
	RecordAcceptance(ctx context.Context, userID, agreementType string) error
}

type limiter interface {
	Allow(ctx context.Context, key, action string, limit int, window time.Duration) (bool, error)
}

type Deps struct {
	Users      userStore
	Agreements agreementStore
	Limiter    limiter
	Verifier   Verifier
	Cfg        *config.Config
}

func NewDeps(users *repository.UserRepo, agreements *repository.AgreementRepo, lim *ratelimit.Limiter, cfg *config.Config) *Deps {
	return &Deps{
		Users:      users,
		Agreements: agreements,
		Limiter:    lim,
		Verifier:   NewTokenInfoVerifier(cfg.GoogleClientID),
		Cfg:        cfg,
	}
}

// Mount registers POST /auth/google. It is a single route rather than a
// sub-router because internal/auth already owns the /auth sub-router.
func Mount(r chi.Router, deps *Deps) {
	r.Post("/auth/google", SignIn(deps))
}

const (
	// Each attempt costs a call to Google, so it is limited per IP on top of
	// the per-account lockout the password login uses.
	attemptsPerIPPer15Min = 20
	// Same bucket and limit as the normal client registration.
	registerRateLimitPerIPPerHour = 5

	// StatusTermsRequired tells the web app this Google email has no account
	// yet and the Client ToS must be accepted before one is created.
	StatusTermsRequired = http.StatusPreconditionRequired

	msgGeneric       = "terjadi kesalahan, coba lagi"
	msgUnavailable   = "masuk dengan Google belum tersedia, silakan masuk dengan email"
	msgUnverified    = "akun Google tidak bisa diverifikasi, coba lagi"
	msgTermsRequired = "email ini belum punya akun DuaCincin. Setujui Ketentuan Layanan Client untuk membuat akun"
	msgVendorTerms   = "email ini belum punya akun DuaCincin. Setujui Perjanjian Kemitraan Vendor untuk membuat akun vendor"
	msgBadRole       = "peran pendaftaran tidak dikenal"
)

type signInRequest struct {
	Credential  string `json:"credential"`
	Role        string `json:"role"`
	AcceptTerms bool   `json:"accept_terms"`
}

// SignIn verifies a Google ID token and signs the user in the same way the
// password login does (same cookie, same JWT, same lock and sanction checks).
// An email with no account becomes a new client account (or a vendor
// account when role is "vendor", from the vendor sign-up form) only after
// the matching agreement is accepted, recorded like the normal
// registration. An existing account keeps its own role: Google never
// upgrades an account and never creates admin or consultant accounts.
func SignIn(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req signInRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		role := req.Role
		if role == "" {
			role = auth.RoleClient
		}
		if role != auth.RoleClient && role != auth.RoleVendor {
			httpx.Error(w, http.StatusBadRequest, msgBadRole)
			return
		}
		if deps.Cfg.GoogleClientID == "" || deps.Verifier == nil {
			httpx.Error(w, http.StatusServiceUnavailable, msgUnavailable)
			return
		}
		if strings.TrimSpace(req.Credential) == "" {
			httpx.Error(w, http.StatusBadRequest, msgUnverified)
			return
		}

		ip := auth.ClientIP(r)
		ok, err := deps.Limiter.Allow(r.Context(), "google:"+ip, "google_login", attemptsPerIPPer15Min, 15*time.Minute)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, msgGeneric)
			return
		}
		if !ok {
			httpx.Error(w, http.StatusTooManyRequests, "terlalu banyak percobaan masuk, coba lagi nanti")
			return
		}

		id, err := deps.Verifier.Verify(r.Context(), req.Credential)
		if err != nil {
			if !errors.Is(err, ErrInvalidToken) {
				log.Printf("googleauth: verify: %v", err)
			}
			httpx.Error(w, http.StatusUnauthorized, msgUnverified)
			return
		}

		user, err := deps.Users.GetByEmail(r.Context(), id.Email)
		switch {
		case err == nil:
			signInExisting(w, r, deps, user)
		case errors.Is(err, repository.ErrNotFound):
			createAccount(w, r, deps, id, role, req.AcceptTerms, ip)
		default:
			httpx.Error(w, http.StatusInternalServerError, msgGeneric)
		}
	}
}

func signInExisting(w http.ResponseWriter, r *http.Request, deps *Deps, user *repository.User) {
	if !slices.Contains(auth.LoginRoles, user.Role) {
		httpx.Error(w, http.StatusUnauthorized, msgUnverified)
		return
	}
	if user.IsLocked() {
		httpx.Error(w, http.StatusTooManyRequests, auth.LockedMessage)
		return
	}
	if user.IsBlocked() {
		httpx.Error(w, http.StatusForbidden, auth.BlockedMessage)
		return
	}
	if err := deps.Users.ResetFailedLogin(r.Context(), user.ID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, msgGeneric)
		return
	}
	issueSession(w, deps, user, http.StatusOK)
}

func createAccount(w http.ResponseWriter, r *http.Request, deps *Deps, id *Identity, role string, acceptTerms bool, ip string) {
	agreement, termsMsg := repository.AgreementTypeClientTOS, msgTermsRequired
	if role == auth.RoleVendor {
		agreement, termsMsg = repository.AgreementTypeVendorPartnership, msgVendorTerms
	}
	if !acceptTerms {
		httpx.JSON(w, StatusTermsRequired, map[string]string{"error": termsMsg, "code": "terms_required"})
		return
	}

	ok, err := deps.Limiter.Allow(r.Context(), "register:"+ip, "register", registerRateLimitPerIPPerHour, time.Hour)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, msgGeneric)
		return
	}
	if !ok {
		httpx.Error(w, http.StatusTooManyRequests, "terlalu banyak percobaan daftar, coba lagi nanti")
		return
	}

	// The account has no password yet; a random one nobody knows keeps the
	// password column valid. The owner can set a real one via "Lupa password".
	hash, err := randomPasswordHash()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, msgGeneric)
		return
	}

	name := id.Name
	if name == "" {
		name = strings.Split(id.Email, "@")[0]
	}
	user, err := deps.Users.Create(r.Context(), id.Email, hash, role, name)
	if err != nil {
		if errors.Is(err, repository.ErrDuplicateEmail) {
			// Created by a parallel request a moment ago: sign in to it
			// through the same checks instead of failing.
			existing, getErr := deps.Users.GetByEmail(r.Context(), id.Email)
			if getErr == nil {
				signInExisting(w, r, deps, existing)
				return
			}
		}
		httpx.Error(w, http.StatusInternalServerError, msgGeneric)
		return
	}

	if err := deps.Agreements.RecordAcceptance(r.Context(), user.ID, agreement); err != nil {
		httpx.Error(w, http.StatusInternalServerError, msgGeneric)
		return
	}
	issueSession(w, deps, user, http.StatusCreated)
}

func issueSession(w http.ResponseWriter, deps *Deps, user *repository.User, status int) {
	token, err := security.IssueSessionToken(deps.Cfg.JWTSecret, user.ID, user.Role)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, msgGeneric)
		return
	}
	auth.SetSessionCookie(w, deps.Cfg, token)
	httpx.JSON(w, status, auth.UserResponse(user))
}

func randomPasswordHash() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return security.HashPassword(hex.EncodeToString(b))
}
