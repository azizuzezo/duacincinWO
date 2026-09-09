package budget

import (
	"math"
	"net/http"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

const percentageTolerance = 0.5 // allows for frontend rounding drift

type categoryRequest struct {
	Category   string  `json:"category"`
	Percentage float64 `json:"percentage"`
}

type upsertPlanRequest struct {
	TotalBudget int64             `json:"total_budget"`
	GuestCount  int               `json:"guest_count"`
	Categories  []categoryRequest `json:"categories"`
}

type categoryDTO struct {
	Category   string  `json:"category"`
	Percentage float64 `json:"percentage"`
	Amount     int64   `json:"amount"`
}

type planDTO struct {
	TotalBudget int64         `json:"total_budget"`
	GuestCount  int           `json:"guest_count"`
	Categories  []categoryDTO `json:"categories"`
}

func toPlanDTO(p *repository.BudgetPlan) planDTO {
	dto := planDTO{TotalBudget: p.TotalBudget, GuestCount: p.GuestCount}
	for _, c := range p.Categories {
		dto.Categories = append(dto.Categories, categoryDTO{
			Category:   c.Category,
			Percentage: c.Percentage,
			Amount:     int64(math.Round(float64(p.TotalBudget) * c.Percentage / 100)),
		})
	}
	return dto
}

// UpsertPlan validates and saves the Client's whole budget plan (PRD §8.8).
// The frontend is responsible for keeping percentages proportionally
// rescaled live as the user adjusts sliders — the backend only checks the
// final result sums to ~100%.
func UpsertPlan(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		var req upsertPlanRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}

		if req.TotalBudget < 0 || req.GuestCount < 0 {
			httpx.Error(w, http.StatusBadRequest, "total budget dan jumlah tamu tidak boleh negatif")
			return
		}

		if len(req.Categories) != len(DefaultPercentages) {
			httpx.Error(w, http.StatusBadRequest, "kategori budget tidak lengkap")
			return
		}

		seen := make(map[string]bool, len(req.Categories))
		sum := 0.0
		categories := make([]repository.BudgetCategory, 0, len(req.Categories))
		for _, c := range req.Categories {
			if _, valid := DefaultPercentages[c.Category]; !valid || seen[c.Category] {
				httpx.Error(w, http.StatusBadRequest, "kategori budget tidak valid")
				return
			}
			if c.Percentage < 0 {
				httpx.Error(w, http.StatusBadRequest, "persentase tidak boleh negatif")
				return
			}
			seen[c.Category] = true
			sum += c.Percentage
			categories = append(categories, repository.BudgetCategory{Category: c.Category, Percentage: c.Percentage})
		}

		if math.Abs(sum-100) > percentageTolerance {
			httpx.Error(w, http.StatusBadRequest, "total persentase kategori harus 100%")
			return
		}

		plan, err := deps.Budget.Upsert(r.Context(), claims.UserID, req.TotalBudget, req.GuestCount, categories)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusOK, toPlanDTO(plan))
	}
}

// MyPlan returns the Client's saved plan, or the PRD §8.8 default split
// (with a zero budget) if they haven't saved one yet.
func MyPlan(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		plan, err := deps.Budget.GetByClientID(r.Context(), claims.UserID)
		if err != nil {
			if err == repository.ErrNotFound {
				httpx.JSON(w, http.StatusOK, defaultPlanDTO())
				return
			}
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusOK, toPlanDTO(plan))
	}
}

func defaultPlanDTO() planDTO {
	dto := planDTO{TotalBudget: 0, GuestCount: 0}
	for category, pct := range DefaultPercentages {
		dto.Categories = append(dto.Categories, categoryDTO{Category: category, Percentage: pct, Amount: 0})
	}
	return dto
}
