package chat

import (
	"log"
	"net/http"
	"slices"
	"time"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/briefs"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

// repeatWindow is how long the same brief (same category) is not sent again
// to a vendor that already has one from this client.
const repeatWindow = 14 * 24 * time.Hour

type sendBriefRequest struct {
	briefs.Brief
	VendorIDs []string `json:"vendor_ids"`
}

type briefSent struct {
	VendorID       string `json:"vendor_id"`
	BusinessName   string `json:"business_name"`
	ConversationID string `json:"conversation_id"`
}

type briefSkipped struct {
	VendorID string `json:"vendor_id"`
	Reason   string `json:"reason"`
}

// SendBrief sends one brief to up to briefs.MaxVendors approved vendors that
// offer the category. Each vendor gets it as the first message of the
// client's chat with them (created if needed), so the reply, notifications
// and the vendor's inbox are the ordinary chat.
func SendBrief(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		ctx := r.Context()

		var req sendBriefRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}
		if err := req.Brief.Normalize(); err != nil {
			httpx.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		if ContainsContactInfo(req.Brief.FreeText()) {
			httpx.Error(w, http.StatusBadRequest, "Brief tidak boleh berisi nomor HP, email, atau tautan. Semua komunikasi dengan vendor dilakukan lewat chat DuaCincin.")
			return
		}
		ids := make([]string, 0, len(req.VendorIDs))
		for _, id := range req.VendorIDs {
			if id != "" && !slices.Contains(ids, id) {
				ids = append(ids, id)
			}
		}
		if len(ids) == 0 {
			httpx.Error(w, http.StatusBadRequest, "pilih minimal satu vendor")
			return
		}
		if len(ids) > briefs.MaxVendors {
			httpx.Error(w, http.StatusBadRequest, "satu brief maksimal untuk 5 vendor")
			return
		}

		since := time.Now().Add(-24 * time.Hour)
		if n, err := deps.Briefs.CountSince(ctx, claims.UserID, since); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		} else if n >= briefs.MaxPerDay {
			httpx.Error(w, http.StatusTooManyRequests, "Batas kirim brief hari ini sudah tercapai. Coba lagi besok, atau lanjutkan lewat chat vendor yang sudah ada.")
			return
		}

		// Decide who can receive it before writing anything.
		type target struct {
			id, name string
		}
		var targets []target
		skipped := []briefSkipped{}
		for _, id := range ids {
			p, err := deps.Vendors.GetByUserID(ctx, id)
			switch {
			case err != nil || p.Status != "approved":
				skipped = append(skipped, briefSkipped{id, "vendor tidak ditemukan"})
				continue
			case !slices.Contains(p.Categories, req.Category):
				skipped = append(skipped, briefSkipped{id, "vendor tidak menyediakan kategori ini"})
				continue
			}
			if dup, err := deps.Briefs.SentSince(ctx, claims.UserID, id, req.Category, time.Now().Add(-repeatWindow)); err == nil && dup {
				skipped = append(skipped, briefSkipped{id, "brief untuk kategori ini sudah terkirim ke vendor ini"})
				continue
			}
			targets = append(targets, target{id, p.BusinessName})
		}
		if len(targets) == 0 {
			httpx.JSON(w, http.StatusConflict, map[string]any{"error": "brief tidak bisa dikirim ke vendor yang dipilih", "skipped": skipped})
			return
		}

		briefID, err := deps.Briefs.Create(ctx, claims.UserID, req.Brief)
		if err != nil {
			log.Printf("brief: create: %v", err)
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		body := req.Brief.Message()
		sent := []briefSent{}
		for _, t := range targets {
			conv, err := deps.Chat.GetOrCreateVendorChat(ctx, claims.UserID, t.id)
			if err != nil {
				skipped = append(skipped, briefSkipped{t.id, "chat tidak bisa dibuka"})
				continue
			}
			message, err := deps.Chat.CreateMessage(ctx, conv.ID, claims.UserID, body, false, nil, nil, nil)
			if err != nil {
				reason := "pesan tidak bisa dikirim"
				if err == repository.ErrConversationClosed {
					reason = "sesi chat dengan vendor ini sedang ditutup"
				}
				skipped = append(skipped, briefSkipped{t.id, reason})
				continue
			}
			if err := deps.Briefs.AddRecipient(ctx, briefID, t.id, conv.ID); err != nil {
				log.Printf("brief: recipient: %v", err)
			}
			deliver(deps, ctx, conv, claims.UserID, message)
			sent = append(sent, briefSent{t.id, t.name, conv.ID})
		}
		if len(sent) == 0 {
			httpx.JSON(w, http.StatusConflict, map[string]any{"error": "brief tidak bisa dikirim ke vendor yang dipilih", "skipped": skipped})
			return
		}
		httpx.JSON(w, http.StatusCreated, map[string]any{"brief_id": briefID, "sent": sent, "skipped": skipped})
	}
}
