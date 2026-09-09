package vendors

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/httpx"
)

type directoryCardDTO struct {
	ID          string `json:"id"`
	Category    string `json:"category"`
	City        string `json:"city"`
	PriceMin    int64  `json:"price_min"`
	PriceMax    int64  `json:"price_max"`
	SampleImage string `json:"sample_image,omitempty"`
}

// Directory is the PUBLIC (no auth required) anonymized vendor listing —
// never includes business_name or contact info (PRD §8.1/§8.3). The
// frontend is responsible for rendering sample_image with a blur/watermark
// filter for anonymous visitors.
func Directory(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		category := r.URL.Query().Get("category")
		city := r.URL.Query().Get("city")

		if category != "" && !ValidCategories[category] {
			httpx.Error(w, http.StatusBadRequest, "kategori tidak valid")
			return
		}

		profiles, err := deps.Vendors.ListApproved(r.Context(), category, city)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		cards := make([]directoryCardDTO, 0, len(profiles))
		for _, p := range profiles {
			card := directoryCardDTO{ID: p.UserID, Category: p.Category, City: p.City, PriceMin: p.PriceMin, PriceMax: p.PriceMax}
			if items, err := deps.Vendors.ListPortfolio(r.Context(), p.UserID); err == nil && len(items) > 0 {
				card.SampleImage = items[0].PublicURL
			}
			cards = append(cards, card)
		}

		httpx.JSON(w, http.StatusOK, cards)
	}
}

// VendorDetail is the UNLOCKED profile (auth required — PRD §8.3): full
// business name and portfolio, still no direct vendor contact info.
func VendorDetail(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		profile, err := deps.Vendors.GetByUserID(r.Context(), id)
		if err != nil || profile.Status != "approved" {
			httpx.Error(w, http.StatusNotFound, "vendor tidak ditemukan")
			return
		}

		items, err := deps.Vendors.ListPortfolio(r.Context(), id)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		dto := toProfileDTO(profile)
		dto.Portfolio = toPortfolioDTOs(items)
		httpx.JSON(w, http.StatusOK, dto)
	}
}
