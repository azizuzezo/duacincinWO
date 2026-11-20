package whatsapp

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/waphone"
)

// Admin panel: send one WhatsApp message to a client or vendor with a
// verified number, through the official number. Every send is written to
// the audit log (action whatsapp.admin_send), which is also the history.

const (
	auditAdminWhatsApp  = "whatsapp.admin_send"
	adminMessageMaxRune = 1000
	adminSendPerHour    = 60
)

type recipientDTO struct {
	UserID       string `json:"user_id"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	BusinessName string `json:"business_name,omitempty"`
	PhoneDisplay string `json:"phone_display"`
}

// AdminRecipients: GET /whatsapp/admin/recipients?q=&role=client|vendor&user_id=
func AdminRecipients(d *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := strings.TrimSpace(r.URL.Query().Get("q"))
		if len([]rune(q)) > 80 {
			q = string([]rune(q)[:80])
		}
		role := r.URL.Query().Get("role")
		if role != auth.RoleClient && role != auth.RoleVendor {
			role = ""
		}
		userID := strings.TrimSpace(r.URL.Query().Get("user_id"))
		if len(userID) != 36 {
			userID = ""
		}
		list, err := d.Links.SearchRecipients(r.Context(), q, role, userID, 20)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]recipientDTO, 0, len(list))
		for _, x := range list {
			out = append(out, recipientDTO{
				UserID: x.UserID, Name: x.FullName, Email: x.Email, Role: x.Role,
				BusinessName: x.BusinessName, PhoneDisplay: waphone.Display(x.Phone),
			})
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

// adminMessageText wraps the admin's text so the recipient knows it is
// from DuaCincin's team and that this number takes no replies.
func adminMessageText(message, webBase string) string {
	return fmt.Sprintf(`📣 *Pesan dari Tim DuaCincin*

%s

_Nomor ini khusus notifikasi dan tidak menerima balasan. Butuh bantuan? Hubungi kami lewat chat di %s._`, message, webHost(webBase))
}

// AdminSendWhatsApp: POST /whatsapp/admin/send { user_id, message }
func AdminSendWhatsApp(d *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		var req struct {
			UserID  string `json:"user_id"`
			Message string `json:"message"`
		}
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}
		message := strings.TrimSpace(strings.ReplaceAll(req.Message, "\r\n", "\n"))
		if message == "" {
			httpx.Error(w, http.StatusBadRequest, "tulis pesannya dulu")
			return
		}
		if len([]rune(message)) > adminMessageMaxRune {
			httpx.Error(w, http.StatusBadRequest, fmt.Sprintf("pesan maksimal %d karakter", adminMessageMaxRune))
			return
		}
		ctx := r.Context()
		if len(req.UserID) != 36 {
			httpx.Error(w, http.StatusBadRequest, "pilih penerima dulu")
			return
		}
		list, err := d.Links.SearchRecipients(ctx, "", "", req.UserID, 1)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if len(list) == 0 {
			httpx.Error(w, http.StatusBadRequest, "penerima belum punya nomor WhatsApp terverifikasi")
			return
		}
		to := list[0]
		if ok, err := d.Limiter.Allow(ctx, "wa-admin-send:"+claims.UserID, "wa_admin_send", adminSendPerHour, time.Hour); err != nil || !ok {
			httpx.Error(w, http.StatusTooManyRequests, fmt.Sprintf("batas %d pesan WhatsApp per jam tercapai, coba lagi nanti", adminSendPerHour))
			return
		}

		if err := d.sendNow(ctx, to.Phone, adminMessageText(message, d.Cfg.WebBaseURL)); err != nil {
			if errors.Is(err, errOfficialDown) {
				httpx.Error(w, http.StatusServiceUnavailable, "WhatsApp DuaCincin sedang terputus. Hubungkan ulang dari beranda admin, lalu kirim lagi.")
				return
			}
			httpx.Error(w, http.StatusBadGateway, "pesan belum terkirim ke WhatsApp, coba lagi")
			return
		}

		name := to.FullName
		if to.BusinessName != "" {
			name = to.BusinessName
		}
		if d.AuditLog != nil {
			_ = d.AuditLog.Create(ctx, claims.UserID, claims.Role, auditAdminWhatsApp, "user", to.UserID, map[string]any{
				"recipient_name": name,
				"recipient_role": to.Role,
				"phone_tail":     to.Phone[len(to.Phone)-4:],
				"message":        message,
			})
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"sent": true, "recipient": name})
	}
}

type sentDTO struct {
	ID            string `json:"id"`
	RecipientID   string `json:"recipient_id"`
	RecipientName string `json:"recipient_name"`
	RecipientRole string `json:"recipient_role"`
	PhoneTail     string `json:"phone_tail"`
	Message       string `json:"message"`
	SentBy        string `json:"sent_by"`
	SentAt        string `json:"sent_at"`
}

// AdminSentWhatsApp: GET /whatsapp/admin/sent, the latest admin sends.
func AdminSentWhatsApp(d *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		out := []sentDTO{}
		if d.AuditLog != nil {
			list, err := d.AuditLog.ListByAction(r.Context(), auditAdminWhatsApp, 30)
			if err != nil {
				httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
				return
			}
			str := func(m map[string]any, k string) string { s, _ := m[k].(string); return s }
			for _, e := range list {
				by := e.ActorName
				if by == "" {
					by = e.ActorEmail
				}
				out = append(out, sentDTO{
					ID: e.ID, RecipientID: e.TargetID,
					RecipientName: str(e.Metadata, "recipient_name"), RecipientRole: str(e.Metadata, "recipient_role"),
					PhoneTail: str(e.Metadata, "phone_tail"), Message: str(e.Metadata, "message"),
					SentBy: by, SentAt: e.CreatedAt.Format(time.RFC3339),
				})
			}
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}
