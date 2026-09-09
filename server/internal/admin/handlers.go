// Package admin implements the minimal Admin actions needed for other
// features to function end-to-end — currently just vendor approval, which
// Fase 2 (direktori vendor) depends on. The full Admin/Backoffice feature
// set (dispute queue, Inspirasi moderation, commission config, dashboard)
// is out of scope here and lands in Fase 7 (PRD §8.10).
package admin

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

type Deps struct {
	Vendors *repository.VendorRepo
}

func NewDeps(vendors *repository.VendorRepo) *Deps {
	return &Deps{Vendors: vendors}
}

type vendorSummaryDTO struct {
	UserID       string `json:"user_id"`
	BusinessName string `json:"business_name"`
	Category     string `json:"category"`
	City         string `json:"city"`
	Status       string `json:"status"`
}

func listPending(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		profiles, err := deps.Vendors.ListPending(r.Context())
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]vendorSummaryDTO, 0, len(profiles))
		for _, p := range profiles {
			out = append(out, vendorSummaryDTO{UserID: p.UserID, BusinessName: p.BusinessName, Category: p.Category, City: p.City, Status: p.Status})
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

func approveVendor(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		if err := deps.Vendors.SetStatus(r.Context(), id, "approved", nil); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "vendor disetujui"})
	}
}

type rejectRequest struct {
	Reason string `json:"reason"`
}

func rejectVendor(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		var req rejectRequest
		_ = httpx.DecodeJSON(w, r, &req)

		if err := deps.Vendors.SetStatus(r.Context(), id, "rejected", &req.Reason); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "vendor ditolak"})
	}
}

// Mount registers /admin/* routes onto r, restricted to the admin role.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	r.Route("/admin", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))
		r.Use(auth.RequireRole(auth.RoleAdmin))

		r.Get("/vendors/pending", listPending(deps))
		r.Post("/vendors/{id}/approve", approveVendor(deps))
		r.Post("/vendors/{id}/reject", rejectVendor(deps))
	})
}
