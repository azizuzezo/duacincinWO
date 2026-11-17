package admin

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

// pricePair shows one price twice: as the vendor typed it and as couples see
// it on the website (vendor price plus commission).
type pricePair struct {
	Vendor  int64 `json:"vendor"`
	Website int64 `json:"website"`
}

func pair(vendorPrice int64, rate float64) pricePair {
	return pricePair{Vendor: vendorPrice, Website: repository.CustomerPrice(vendorPrice, rate)}
}

type adminPackageDTO struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       pricePair `json:"price"`
	UpdatedAt   string    `json:"updated_at"`
}

type adminVendorDetailDTO struct {
	UserID          string            `json:"user_id"`
	BusinessName    string            `json:"business_name"`
	Category        string            `json:"category"`
	Categories      []string          `json:"categories"`
	City            string            `json:"city"`
	Cities          []string          `json:"cities"`
	Description     string            `json:"description"`
	Status          string            `json:"status"`
	RejectionReason *string           `json:"rejection_reason,omitempty"`
	OwnerName       string            `json:"owner_name"`
	Email           string            `json:"email"`
	WhatsAppNumber  string            `json:"whatsapp_number"`
	AccountStatus   string            `json:"account_status"`
	JoinedAt        string            `json:"joined_at"`
	ProfileUpdated  string            `json:"profile_updated_at"`
	CommissionRate  float64           `json:"commission_rate"`
	CommissionIsSet bool              `json:"commission_is_custom"`
	PriceMin        pricePair         `json:"price_min"`
	PriceMax        pricePair         `json:"price_max"`
	Packages        []adminPackageDTO `json:"packages"`
	Portfolio       []string          `json:"portfolio"`
}

// vendorDetail gives Admin the whole priced profile of one vendor (any
// status): every price as the vendor entered it next to the price couples
// see, so a typo or an outdated starting price is caught before a booking.
func vendorDetail(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		if _, err := uuid.Parse(id); err != nil {
			httpx.Error(w, http.StatusNotFound, "vendor tidak ditemukan")
			return
		}
		profile, err := deps.Vendors.GetByUserID(r.Context(), id)
		if errors.Is(err, repository.ErrNotFound) {
			httpx.Error(w, http.StatusNotFound, "vendor tidak ditemukan")
			return
		}
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		user, err := deps.Users.GetByID(r.Context(), id)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		pkgs, err := deps.Vendors.Packages().ListForVendor(r.Context(), id)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		items, err := deps.Vendors.ListPortfolio(r.Context(), id)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		rate := profile.EffectiveCommissionRate()
		out := adminVendorDetailDTO{
			UserID: profile.UserID, BusinessName: profile.BusinessName, Category: profile.Category, Categories: profile.Categories,
			City: profile.City, Cities: profile.Cities, Description: profile.Description,
			Status: profile.Status, RejectionReason: profile.RejectionReason,
			OwnerName: user.FullName, Email: user.Email, WhatsAppNumber: profile.WhatsAppNumber, AccountStatus: user.AccountStatus,
			JoinedAt: user.CreatedAt.Format(time.RFC3339), ProfileUpdated: profile.UpdatedAt.Format(time.RFC3339),
			CommissionRate: rate, CommissionIsSet: profile.CommissionRate != nil,
			PriceMin: pair(profile.PriceMin, rate), PriceMax: pair(profile.PriceMax, rate),
			Packages:  make([]adminPackageDTO, 0, len(pkgs)),
			Portfolio: make([]string, 0, len(items)),
		}
		if out.Cities == nil {
			out.Cities = []string{}
		}
		for _, p := range pkgs {
			out.Packages = append(out.Packages, adminPackageDTO{
				ID: p.ID, Name: p.Name, Description: p.Description,
				Price: pair(p.Price, rate), UpdatedAt: p.UpdatedAt.Format(time.RFC3339),
			})
		}
		for _, it := range items {
			out.Portfolio = append(out.Portfolio, it.PublicURL)
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}
