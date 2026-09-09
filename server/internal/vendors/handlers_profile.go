package vendors

import (
	"net/http"
	"strings"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

type upsertProfileRequest struct {
	BusinessName string `json:"business_name"`
	Category     string `json:"category"`
	City         string `json:"city"`
	PriceMin     int64  `json:"price_min"`
	PriceMax     int64  `json:"price_max"`
	Description  string `json:"description"`
}

type profileDTO struct {
	UserID          string         `json:"user_id"`
	BusinessName    string         `json:"business_name"`
	Category        string         `json:"category"`
	City            string         `json:"city"`
	PriceMin        int64          `json:"price_min"`
	PriceMax        int64          `json:"price_max"`
	Description     string         `json:"description"`
	Status          string         `json:"status"`
	RejectionReason *string        `json:"rejection_reason,omitempty"`
	Portfolio       []portfolioDTO `json:"portfolio,omitempty"`
}

type portfolioDTO struct {
	ID      string `json:"id"`
	URL     string `json:"url"`
	AltText string `json:"alt_text"`
}

func toProfileDTO(p *repository.VendorProfile) profileDTO {
	return profileDTO{
		UserID:          p.UserID,
		BusinessName:    p.BusinessName,
		Category:        p.Category,
		City:            p.City,
		PriceMin:        p.PriceMin,
		PriceMax:        p.PriceMax,
		Description:     p.Description,
		Status:          p.Status,
		RejectionReason: p.RejectionReason,
	}
}

// UpsertProfile lets a Vendor create/update their own profile. Any edit
// resets status to "pending" — must be re-approved by an Admin (PRD §8.3).
func UpsertProfile(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		var req upsertProfileRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}

		req.BusinessName = strings.TrimSpace(req.BusinessName)
		req.City = strings.TrimSpace(req.City)

		if req.BusinessName == "" {
			httpx.Error(w, http.StatusBadRequest, "nama usaha wajib diisi")
			return
		}
		if !ValidCategories[req.Category] {
			httpx.Error(w, http.StatusBadRequest, "kategori tidak valid")
			return
		}
		if req.City == "" {
			httpx.Error(w, http.StatusBadRequest, "kota wajib diisi")
			return
		}
		if req.PriceMin < 0 || req.PriceMax < req.PriceMin {
			httpx.Error(w, http.StatusBadRequest, "rentang harga tidak valid")
			return
		}

		profile, err := deps.Vendors.UpsertProfile(
			r.Context(), claims.UserID, req.BusinessName, req.Category, req.City,
			req.PriceMin, req.PriceMax, req.Description,
		)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusOK, toProfileDTO(profile))
	}
}

// MyProfile returns the authenticated Vendor's own profile + portfolio,
// including its current approval status.
func MyProfile(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		profile, err := deps.Vendors.GetByUserID(r.Context(), claims.UserID)
		if err != nil {
			if err == repository.ErrNotFound {
				httpx.Error(w, http.StatusNotFound, "profil belum dibuat")
				return
			}
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		items, err := deps.Vendors.ListPortfolio(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		dto := toProfileDTO(profile)
		dto.Portfolio = toPortfolioDTOs(items)
		httpx.JSON(w, http.StatusOK, dto)
	}
}

func toPortfolioDTOs(items []repository.PortfolioItem) []portfolioDTO {
	out := make([]portfolioDTO, 0, len(items))
	for _, it := range items {
		out = append(out, portfolioDTO{ID: it.ID, URL: it.PublicURL, AltText: it.AltText})
	}
	return out
}
