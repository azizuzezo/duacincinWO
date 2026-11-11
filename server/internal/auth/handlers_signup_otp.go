package auth

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"duacincin/server/internal/email"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/security"
)

const (
	signupOTPLimitPerEmailPer15Min = 3
	signupOTPLimitPerIPPerHour     = 10
	signupVerifyLimitPer15Min      = 8
)

type signupOTPRequest struct {
	Email string `json:"email"`
}

// RequestSignupOTP emails a 6-digit code to an address that is about to be
// registered and returns a short-lived signed ticket holding the code's
// HMAC. Register then needs both the ticket and the code, which proves the
// person signing up can read that inbox. No row is written until the
// account itself is created.
func RequestSignupOTP(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req signupOTPRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))
		if !emailRe.MatchString(req.Email) {
			httpx.Error(w, http.StatusBadRequest, "email tidak valid")
			return
		}

		emailOK, err := deps.Limiter.Allow(r.Context(), "signup-otp:email:"+req.Email, "signup_otp", signupOTPLimitPerEmailPer15Min, 15*time.Minute)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		ipOK, err := deps.Limiter.Allow(r.Context(), "signup-otp:ip:"+clientIP(r), "signup_otp", signupOTPLimitPerIPPerHour, time.Hour)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !emailOK || !ipOK {
			httpx.Error(w, http.StatusTooManyRequests, "terlalu banyak permintaan kode, coba lagi nanti")
			return
		}

		// Same answer Register gives for a taken address, so this reveals
		// nothing the sign-up form did not already reveal.
		if _, err := deps.Users.GetByEmail(r.Context(), req.Email); err == nil {
			httpx.Error(w, http.StatusConflict, "email sudah terdaftar, silakan masuk")
			return
		}

		code, err := security.GenerateOTP()
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		ticket, err := security.IssueSignupTicket(deps.Cfg.JWTSecret, req.Email, security.HashOTP(deps.Cfg.OTPHMACSecret, code))
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		if err := sendSignupOTPEmail(r, deps, req.Email, code); err != nil {
			log.Printf("send signup otp: %v", err)
			httpx.Error(w, http.StatusBadGateway, "kode belum bisa dikirim ke email ini, coba lagi sebentar lagi")
			return
		}

		httpx.JSON(w, http.StatusOK, map[string]any{
			"signup_ticket": ticket,
			"expires_in":    int(security.SignupTicketTTL.Seconds()),
		})
	}
}

func sendSignupOTPEmail(r *http.Request, deps *Deps, to, code string) error {
	if deps.Cfg.ResendAPIKey == "" {
		log.Printf("[DEV] kode pendaftaran untuk %s: %s (RESEND_API_KEY belum diset)", to, code)
		return nil
	}
	logoURL := ""
	if deps.Cfg.PublicAssetBaseURL != "" {
		logoURL = strings.TrimRight(deps.Cfg.PublicAssetBaseURL, "/") + "/brand/duacincin-logo.webp"
	}
	subject, html, err := email.RenderSignupOTPEmail(logoURL, code)
	if err != nil {
		return err
	}
	return deps.Mailer.SendWithText(r.Context(), to, subject, html, email.RenderSignupOTPText(code))
}

var errSignupCode = errors.New("kode verifikasi salah atau sudah kedaluwarsa")

// checkSignupCode verifies the ticket/code pair for email. It returns an
// HTTP status and message ready for the client when the check fails.
func checkSignupCode(r *http.Request, deps *Deps, emailAddr, ticket, code string) (int, string) {
	if strings.TrimSpace(ticket) == "" || strings.TrimSpace(code) == "" {
		return http.StatusBadRequest, "masukkan kode verifikasi yang dikirim ke email kamu"
	}
	ok, err := deps.Limiter.Allow(r.Context(), "signup-verify:"+emailAddr, "signup_verify", signupVerifyLimitPer15Min, 15*time.Minute)
	if err != nil {
		return http.StatusInternalServerError, "terjadi kesalahan, coba lagi"
	}
	if !ok {
		return http.StatusTooManyRequests, "terlalu banyak percobaan kode, coba lagi nanti"
	}
	claims, err := security.ParseSignupTicket(deps.Cfg.JWTSecret, ticket)
	if err != nil || claims.Email != emailAddr || !security.VerifyOTP(deps.Cfg.OTPHMACSecret, strings.TrimSpace(code), claims.CodeHash) {
		return http.StatusBadRequest, errSignupCode.Error()
	}
	return 0, ""
}
