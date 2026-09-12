package vendors

import (
	"net/http"
	"strings"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

type requestNameChangeRequest struct {
	RequestedName string `json:"requested_name"`
	Reason        string `json:"reason"`
}

type nameChangeDTO struct {
	ID            string `json:"id"`
	CurrentName   string `json:"current_name"`
	RequestedName string `json:"requested_name"`
	Reason        string `json:"reason"`
	Status        string `json:"status"`
}

func toNameChangeDTO(req *repository.VendorNameChangeRequest) nameChangeDTO {
	return nameChangeDTO{
		ID:            req.ID,
		CurrentName:   req.CurrentName,
		RequestedName: req.RequestedName,
		Reason:        req.Reason,
		Status:        req.Status,
	}
}

// RequestNameChange queues a business_name change for Admin review — only
// one pending request per vendor at a time (PRD §8.3 update, see
// engineering.md).
func RequestNameChange(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		var req requestNameChangeRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		req.RequestedName = strings.TrimSpace(req.RequestedName)
		req.Reason = strings.TrimSpace(req.Reason)
		if req.RequestedName == "" {
			httpx.Error(w, http.StatusBadRequest, "nama baru wajib diisi")
			return
		}
		if req.Reason == "" {
			httpx.Error(w, http.StatusBadRequest, "alasan perubahan wajib diisi")
			return
		}

		profile, err := deps.Vendors.GetByUserID(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusNotFound, "profil belum dibuat")
			return
		}

		if _, err := deps.NameChange.GetPendingForVendor(r.Context(), claims.UserID); err == nil {
			httpx.Error(w, http.StatusConflict, "masih ada permintaan ganti nama yang sedang ditinjau")
			return
		} else if err != repository.ErrNotFound {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		created, err := deps.NameChange.Create(r.Context(), claims.UserID, profile.BusinessName, req.RequestedName, req.Reason)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusCreated, toNameChangeDTO(created))
	}
}
