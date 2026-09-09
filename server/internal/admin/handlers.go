// Package admin implements the minimal Admin actions needed for other
// features to function end-to-end — vendor approval (Fase 2) and marking
// vendor disbursements paid (Fase 6, since a completed booking needs
// someone to actually release the held funds). The full Admin/Backoffice
// feature set (dispute queue, Inspirasi moderation, commission config,
// dashboard) is out of scope here and lands in Fase 7 (PRD §8.10).
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
	Vendors       *repository.VendorRepo
	Disbursements *repository.DisbursementRepo
}

func NewDeps(vendors *repository.VendorRepo, disbursements *repository.DisbursementRepo) *Deps {
	return &Deps{Vendors: vendors, Disbursements: disbursements}
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

type disbursementDTO struct {
	BookingID        string `json:"booking_id"`
	GrossAmount      int64  `json:"gross_amount"`
	CommissionAmount int64  `json:"commission_amount"`
	NetAmount        int64  `json:"net_amount"`
	Status           string `json:"status"`
}

func listPendingDisbursements(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		items, err := deps.Disbursements.ListPending(r.Context())
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]disbursementDTO, 0, len(items))
		for _, d := range items {
			out = append(out, disbursementDTO{BookingID: d.BookingID, GrossAmount: d.GrossAmount, CommissionAmount: d.CommissionAmount, NetAmount: d.NetAmount, Status: d.Status})
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

func markDisbursed(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		bookingID := chi.URLParam(r, "bookingID")
		ok, err := deps.Disbursements.MarkDisbursed(r.Context(), bookingID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !ok {
			httpx.Error(w, http.StatusNotFound, "pencairan tidak ditemukan atau sudah dicairkan")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "dana ditandai sudah dicairkan ke vendor"})
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

		r.Get("/disbursements/pending", listPendingDisbursements(deps))
		r.Post("/disbursements/{bookingID}/mark-disbursed", markDisbursed(deps))
	})
}
