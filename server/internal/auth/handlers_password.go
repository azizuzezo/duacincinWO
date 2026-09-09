package auth

import (
	"log"
	"net/http"
	"strings"
	"time"

	"duacincin/server/internal/email"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/security"
)

const (
	otpTTL = 5 * time.Minute

	otpRequestLimitPerEmailPer15Min = 3
	otpRequestLimitPerIPPerHour     = 5
	otpVerifyLimitPer15Min          = 10
)

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

// ForgotPassword issues an OTP for the password-reset flow. It always
// responds with a generic message, whether or not the email exists, to
// avoid leaking which addresses are registered.
func ForgotPassword(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req forgotPasswordRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))

		const genericResponse = "jika email terdaftar, kode OTP telah dikirim"

		emailOK, err := deps.Limiter.Allow(r.Context(), "otp-request:email:"+req.Email, "otp_request", otpRequestLimitPerEmailPer15Min, 15*time.Minute)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		ipOK, err := deps.Limiter.Allow(r.Context(), "otp-request:ip:"+clientIP(r), "otp_request", otpRequestLimitPerIPPerHour, time.Hour)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !emailOK || !ipOK {
			httpx.Error(w, http.StatusTooManyRequests, "terlalu banyak permintaan OTP, coba lagi nanti")
			return
		}

		user, err := deps.Users.GetByEmail(r.Context(), req.Email)
		if err != nil {
			// Unknown email: respond as if it succeeded (no enumeration).
			httpx.JSON(w, http.StatusOK, map[string]string{"message": genericResponse})
			return
		}

		code, err := security.GenerateOTP()
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		codeHash := security.HashOTP(deps.Cfg.OTPHMACSecret, code)

		if err := deps.OTPs.Create(r.Context(), user.ID, repository.PurposePasswordReset, codeHash, otpTTL); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		sendOTPEmail(r, deps, user.Email, code)

		httpx.JSON(w, http.StatusOK, map[string]string{"message": genericResponse})
	}
}

func sendOTPEmail(r *http.Request, deps *Deps, to, code string) {
	if deps.Cfg.ResendAPIKey == "" {
		log.Printf("[DEV] kode OTP untuk %s: %s (RESEND_API_KEY belum diset)", to, code)
		return
	}

	logoURL := ""
	if deps.Cfg.PublicAssetBaseURL != "" {
		logoURL = strings.TrimRight(deps.Cfg.PublicAssetBaseURL, "/") + "/brand/duacincin-logo.webp"
	}

	subject, html, err := email.RenderPasswordResetOTPEmail(logoURL, code)
	if err != nil {
		log.Printf("render otp email: %v", err)
		return
	}
	if err := deps.Mailer.Send(r.Context(), to, subject, html); err != nil {
		log.Printf("send otp email to %s: %v", to, err)
	}
}

type verifyOTPRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

// VerifyOTP checks the code and, on success, issues a short-lived reset
// ticket the client must submit to ResetPassword.
func VerifyOTP(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req verifyOTPRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))

		ok, err := deps.Limiter.Allow(r.Context(), "otp-verify:"+req.Email, "otp_verify", otpVerifyLimitPer15Min, 15*time.Minute)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !ok {
			httpx.Error(w, http.StatusTooManyRequests, "terlalu banyak percobaan verifikasi, coba lagi nanti")
			return
		}

		const invalidMsg = "kode OTP tidak valid atau sudah kedaluwarsa"

		user, err := deps.Users.GetByEmail(r.Context(), req.Email)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, invalidMsg)
			return
		}

		otp, err := deps.OTPs.GetLatestValid(r.Context(), user.ID, repository.PurposePasswordReset)
		if err != nil || !security.VerifyOTP(deps.Cfg.OTPHMACSecret, req.Code, otp.CodeHash) {
			httpx.Error(w, http.StatusBadRequest, invalidMsg)
			return
		}

		if err := deps.OTPs.MarkConsumed(r.Context(), otp.ID); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		ticket, err := security.IssuePasswordResetTicket(deps.Cfg.JWTSecret, user.ID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusOK, map[string]string{"reset_token": ticket})
	}
}

type resetPasswordRequest struct {
	ResetToken  string `json:"reset_token"`
	NewPassword string `json:"new_password"`
}

func ResetPassword(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req resetPasswordRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		if len(req.NewPassword) < minPasswordLength {
			httpx.Error(w, http.StatusBadRequest, "password minimal 8 karakter")
			return
		}

		claims, err := security.ParsePasswordResetTicket(deps.Cfg.JWTSecret, req.ResetToken)
		if err != nil {
			httpx.Error(w, http.StatusUnauthorized, "tautan reset password tidak valid atau sudah kedaluwarsa")
			return
		}

		hash, err := security.HashPassword(req.NewPassword)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		if err := deps.Users.UpdatePassword(r.Context(), claims.UserID, hash); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusOK, map[string]string{"message": "password berhasil diperbarui"})
	}
}
