package whatsapp

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/security"
	"duacincin/server/internal/waphone"
)

// Every client and vendor account needs a WhatsApp number, proven by a
// 6-digit code sent to that number over WhatsApp from DuaCincin's official
// number. Only then does the relay deliver chats there, so a mistyped
// number never puts someone's conversation on a stranger's phone.

const (
	waCodeTTL         = 10 * time.Minute
	waResendAfter     = 60 * time.Second
	waMaxCodeAttempts = 5
)

type waStatusDTO struct {
	Verified bool `json:"verified"`
	// Phone is the verified number, or the one waiting to be verified.
	Phone        string `json:"phone"`
	PhoneDisplay string `json:"phone_display"`
	// CodeSent: a code is out and still valid for Phone.
	CodeSent bool `json:"code_sent"`
	// ResendIn is the seconds left before another code may be sent.
	ResendIn int `json:"resend_in"`
}

func (d *Deps) waStatus(ctx context.Context, userID string) (waStatusDTO, error) {
	var out waStatusDTO
	link, err := d.Links.GetByUserID(ctx, userID)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return out, err
	}
	if link != nil && link.LinkState == repository.WhatsAppLinkStateLinked {
		out.Verified = true
		out.Phone = link.Phone
	}
	v, err := d.Links.GetVerification(ctx, userID)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return out, err
	}
	if v != nil && !out.Verified {
		out.Phone = v.Phone
	}
	if v != nil && v.CodeHash != nil && v.ExpiresAt != nil && time.Now().Before(*v.ExpiresAt) && v.Attempts < waMaxCodeAttempts {
		out.CodeSent = true
		if !out.Verified {
			out.Phone = v.Phone
		}
	}
	if v != nil && v.SentAt != nil {
		if left := waResendAfter - time.Since(*v.SentAt); left > 0 {
			out.ResendIn = int(left.Seconds()) + 1
		}
	}
	if out.Phone != "" {
		out.PhoneDisplay = waphone.Display(out.Phone)
	}
	return out, nil
}

// MyWhatsApp: GET /whatsapp/me
func MyWhatsApp(d *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		st, err := d.waStatus(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, st)
	}
}

// SendWhatsAppCode: POST /whatsapp/me/code { phone } sends a code to phone
// (or, with no phone, to the number typed at registration).
func SendWhatsAppCode(d *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		var req struct {
			Phone string `json:"phone"`
		}
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}
		ctx := r.Context()

		pending, err := d.Links.GetVerification(ctx, claims.UserID)
		if err != nil && !errors.Is(err, repository.ErrNotFound) {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		phone := ""
		if strings.TrimSpace(req.Phone) != "" {
			n, ok := waphone.Normalize(req.Phone)
			if !ok {
				httpx.Error(w, http.StatusBadRequest, "nomor WhatsApp tidak valid, contoh: 0812 3456 7890")
				return
			}
			phone = n
		} else if pending != nil {
			phone = pending.Phone
		}
		if phone == "" {
			httpx.Error(w, http.StatusBadRequest, "nomor WhatsApp wajib diisi")
			return
		}
		if pending != nil && pending.SentAt != nil && time.Since(*pending.SentAt) < waResendAfter {
			left := int((waResendAfter - time.Since(*pending.SentAt)).Seconds()) + 1
			httpx.Error(w, http.StatusTooManyRequests, fmt.Sprintf("tunggu %d detik sebelum minta kode baru", left))
			return
		}
		taken, err := d.Links.PhoneTakenByOther(ctx, phone, claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if taken {
			httpx.Error(w, http.StatusConflict, "nomor WhatsApp ini sudah dipakai akun DuaCincin lain")
			return
		}
		ok, err := d.Limiter.Allow(ctx, "wa-verify:send:"+claims.UserID, "wa_verify_send", 5, time.Hour)
		if err != nil || !ok {
			httpx.Error(w, http.StatusTooManyRequests, "terlalu banyak permintaan kode, coba lagi dalam 1 jam")
			return
		}

		user, err := d.Users.GetByID(ctx, claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		code, err := security.GenerateOTP()
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if err := d.Links.StartVerification(ctx, claims.UserID, phone, security.HashOTP(d.Cfg.OTPHMACSecret, code), waCodeTTL); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if d.Cfg.WARelayURL == "" && d.Cfg.WhatsAppBotCallbackURL == "" {
			// Local development: no WhatsApp transport, so the code goes to the log.
			log.Printf("[DEV] kode WhatsApp untuk %s: %s (WA_RELAY_URL belum diset)", phone, code)
		} else if err := d.sendNow(ctx, phone, verifyCodeText(code, user.FullName, d.Cfg.WebBaseURL)); err != nil {
			// Let the user ask again straight away: nothing reached them.
			_ = d.Links.SetPendingPhone(ctx, claims.UserID, phone)
			if errors.Is(err, errOfficialDown) {
				httpx.Error(w, http.StatusServiceUnavailable, "WhatsApp DuaCincin sedang gangguan, kode belum terkirim. Coba lagi beberapa saat lagi.")
				return
			}
			httpx.Error(w, http.StatusBadGateway, "kode belum terkirim ke WhatsApp, coba lagi")
			return
		}

		st, _ := d.waStatus(ctx, claims.UserID)
		httpx.JSON(w, http.StatusOK, st)
	}
}

// VerifyWhatsAppCode: POST /whatsapp/me/verify { code }
func VerifyWhatsAppCode(d *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		var req struct {
			Code string `json:"code"`
		}
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}
		ctx := r.Context()
		code := strings.TrimSpace(req.Code)

		v, err := d.Links.GetVerification(ctx, claims.UserID)
		if errors.Is(err, repository.ErrNotFound) || (err == nil && v.CodeHash == nil) {
			httpx.Error(w, http.StatusBadRequest, "minta kode verifikasi dulu")
			return
		}
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if v.ExpiresAt == nil || time.Now().After(*v.ExpiresAt) {
			httpx.Error(w, http.StatusBadRequest, "kode sudah kedaluwarsa, minta kode baru")
			return
		}
		if v.Attempts >= waMaxCodeAttempts {
			httpx.Error(w, http.StatusBadRequest, "terlalu banyak kode salah, minta kode baru")
			return
		}
		if len(code) != security.OTPLength || !security.VerifyOTP(d.Cfg.OTPHMACSecret, code, *v.CodeHash) {
			n, _ := d.Links.BumpAttempt(ctx, claims.UserID)
			if n >= waMaxCodeAttempts {
				httpx.Error(w, http.StatusBadRequest, "kode salah. Kesempatan habis, minta kode baru")
				return
			}
			httpx.Error(w, http.StatusBadRequest, fmt.Sprintf("kode salah, sisa %d kali percobaan", waMaxCodeAttempts-n))
			return
		}

		// A first verified number is a new member: congratulate them. A
		// changed number only gets a short confirmation.
		hadNumber := false
		if prev, err := d.Links.GetByUserID(ctx, claims.UserID); err == nil && prev.LinkState == repository.WhatsAppLinkStateLinked {
			hadNumber = true
		}
		if err := d.Links.LinkVerified(ctx, claims.UserID, v.Phone); err != nil {
			if errors.Is(err, repository.ErrPhoneTaken) {
				httpx.Error(w, http.StatusConflict, "nomor WhatsApp ini sudah dipakai akun DuaCincin lain")
				return
			}
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		if user, err := d.Users.GetByID(ctx, claims.UserID); err == nil {
			jid := v.Phone + "@s.whatsapp.net"
			if hadNumber {
				d.deliver(ctx, jid, numberChangedText(user))
			} else {
				d.deliverImage(ctx, jid, welcomeText(user, d.Cfg.WebBaseURL), welcomeImageURL(user, d.Cfg.WebBaseURL))
			}
		}
		st, _ := d.waStatus(ctx, claims.UserID)
		httpx.JSON(w, http.StatusOK, st)
	}
}

func webHost(base string) string {
	h := strings.TrimPrefix(strings.TrimPrefix(base, "https://"), "http://")
	if h == "" {
		return "duacincin.id"
	}
	return h
}

// verifyCodeText is the WhatsApp message carrying the code. It says plainly
// what the code is for, for which account, how long it lasts, never to share
// it, and what to do if the person did not ask for it.
func verifyCodeText(code, fullName, webBase string) string {
	name := strings.TrimSpace(fullName)
	if name == "" {
		name = "kamu"
	}
	return fmt.Sprintf(`*Kode verifikasi DuaCincin*

Kode kamu: *%s*

Masukkan kode ini di %s untuk menghubungkan nomor WhatsApp ini ke akun DuaCincin atas nama *%s*.

• Berlaku 10 menit.
• Jangan berikan kode ini kepada siapa pun, termasuk yang mengaku dari DuaCincin. Tim DuaCincin tidak pernah meminta kode ini.

Tidak merasa mendaftar di DuaCincin? Abaikan saja pesan ini. Nomor kamu tidak akan terhubung tanpa kode ini.`,
		code, webHost(webBase), name)
}

// welcomeText congratulates a new member once their number is verified
// and says what this number will be used for.
func welcomeText(u *repository.User, webBase string) string {
	base := strings.TrimRight(webBase, "/")
	name := strings.TrimSpace(u.FullName)
	if u.Role == auth.RoleVendor {
		return fmt.Sprintf(`🎉 *Selamat bergabung di DuaCincin, %s!*

Akun vendor kamu sudah aktif dan nomor WhatsApp ini sudah terverifikasi.

Langkah berikutnya:
1. Lengkapi profil usaha, foto portofolio, dan paket harga
2. Tim DuaCincin meninjau profilmu
3. Setelah disetujui, calon pengantin bisa menemukan dan menghubungimu

Lengkapi profil: %s/vendor/profile

Setiap ada pesan baru dari calon pengantin, kami kabari di sini lengkap dengan link untuk membalasnya.

_Nomor ini khusus notifikasi, pesan yang dikirim ke sini tidak dibalas._`, name, base)
	}
	return fmt.Sprintf(`🎉 *Selamat bergabung di DuaCincin, %s!*

Akun kamu sudah aktif dan nomor WhatsApp ini sudah terverifikasi. Semoga persiapan pernikahanmu lancar!

Mulai cari vendor: %s/vendors
Atur rencana & budget: %s/client/dashboard

Setiap ada pesan baru dari vendor, kami kabari di sini lengkap dengan link untuk membalasnya.

_Nomor ini khusus notifikasi, pesan yang dikirim ke sini tidak dibalas._`, name, base, base)
}

// welcomeImageURL is the welcome card sent with welcomeText (web/public/wa).
func welcomeImageURL(u *repository.User, webBase string) string {
	kind := "client"
	if u.Role == auth.RoleVendor {
		kind = "vendor"
	}
	return strings.TrimRight(webBase, "/") + "/wa/welcome-" + kind + ".jpg"
}

// numberChangedText confirms a changed WhatsApp number.
func numberChangedText(u *repository.User) string {
	return fmt.Sprintf(`✅ *Nomor WhatsApp diperbarui*

Nomor ini sekarang dipakai untuk notifikasi akun DuaCincin *%s*. Notifikasi pesan baru akan dikirim ke sini.

_Nomor ini khusus notifikasi, pesan yang dikirim ke sini tidak dibalas._`, strings.TrimSpace(u.FullName))
}
