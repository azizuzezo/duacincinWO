package vendors

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/httpx"
)

type directoryCardDTO struct {
	ID            string  `json:"id"`
	BusinessName  string  `json:"business_name"`
	Category      string  `json:"category"`
	City          string  `json:"city"`
	PriceMin      int64   `json:"price_min"`
	PriceMax      int64   `json:"price_max"`
	SampleImage   string  `json:"sample_image,omitempty"`
	AverageRating float64 `json:"average_rating"`
	ReviewCount   int     `json:"review_count"`
}

// Directory is the PUBLIC (no auth required) vendor listing. Vendor
// portfolios are fully open, browsing them requires no login (product
// decision, see engineering.md) — only booking and chat require an account.
func Directory(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		category := r.URL.Query().Get("category")
		city := r.URL.Query().Get("city")

		if category != "" && !ValidCategories[category] {
			httpx.Error(w, http.StatusBadRequest, "kategori tidak valid")
			return
		}

		// max_price: only vendors whose starting price fits the budget the
		// Client is browsing with (PRD §8.8 budget-to-directory link-through).
		var maxPrice int64
		if raw := r.URL.Query().Get("max_price"); raw != "" {
			parsed, err := strconv.ParseInt(raw, 10, 64)
			if err != nil || parsed < 0 {
				httpx.Error(w, http.StatusBadRequest, "max_price tidak valid")
				return
			}
			maxPrice = parsed
		}

		profiles, err := deps.Vendors.ListApproved(r.Context(), category, city, maxPrice)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		cards := make([]directoryCardDTO, 0, len(profiles))
		for _, p := range profiles {
			card := directoryCardDTO{ID: p.UserID, BusinessName: p.BusinessName, Category: p.Category, City: p.City, PriceMin: p.PriceMin, PriceMax: p.PriceMax}
			if items, err := deps.Vendors.ListPortfolio(r.Context(), p.UserID); err == nil && len(items) > 0 {
				card.SampleImage = items[0].PublicURL
			}
			if avg, count, err := deps.Reviews.GetAggregateForVendor(r.Context(), p.UserID); err == nil {
				card.AverageRating, card.ReviewCount = avg, count
			}
			cards = append(cards, card)
		}

		httpx.JSON(w, http.StatusOK, cards)
	}
}

// VendorDetail is a full public profile: business name and portfolio, still
// no direct vendor contact info (contact stays in-platform chat only, per
// PRD §8.3 anti-circumvention).
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
		if avg, count, err := deps.Reviews.GetAggregateForVendor(r.Context(), id); err == nil {
			dto.AverageRating, dto.ReviewCount = avg, count
		}
		httpx.JSON(w, http.StatusOK, dto)
	}
}
