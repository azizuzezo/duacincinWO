// Package admin implements Admin/Backoffice (PRD §8.10): vendor approval
// (Fase 2), disbursements (Fase 6), and — completing the set here in
// Fase 7 — commission overrides, the anti-circumvention dispute queue with
// sanctions (PRD §8.6), and a dashboard summary.
package admin

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

type Deps struct {
	Vendors       *repository.VendorRepo
	NameChange    *repository.VendorNameChangeRepo
	Disbursements *repository.DisbursementRepo
	Disputes      *repository.DisputeRepo
	Users         *repository.UserRepo
	Bookings      *repository.BookingRepo
	AuditLog      *repository.AuditLogRepo
}

func NewDeps(vendors *repository.VendorRepo, nameChange *repository.VendorNameChangeRepo, disbursements *repository.DisbursementRepo, disputes *repository.DisputeRepo, users *repository.UserRepo, bookings *repository.BookingRepo, auditLog *repository.AuditLogRepo) *Deps {
	return &Deps{Vendors: vendors, NameChange: nameChange, Disbursements: disbursements, Disputes: disputes, Users: users, Bookings: bookings, AuditLog: auditLog}
}

// logAction records one admin action to the audit trail. Failures are
// logged-and-ignored (best-effort) rather than failing the request — the
// action itself already succeeded by the time this is called.
func logAction(deps *Deps, r *http.Request, action, targetType, targetID string, metadata map[string]any) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		return
	}
	if err := deps.AuditLog.Create(r.Context(), claims.UserID, claims.Role, action, targetType, targetID, metadata); err != nil {
		log.Printf("audit log: %v", err)
	}
}

type vendorSummaryDTO struct {
	UserID         string   `json:"user_id"`
	BusinessName   string   `json:"business_name"`
	Category       string   `json:"category"`
	City           string   `json:"city"`
	Status         string   `json:"status"`
	CommissionRate *float64 `json:"commission_rate,omitempty"`
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

// listApproved backs the commission-configuration screen (PRD §8.10).
func listApproved(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		profiles, err := deps.Vendors.ListApproved(r.Context(), "", "", 0)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]vendorSummaryDTO, 0, len(profiles))
		for _, p := range profiles {
			out = append(out, vendorSummaryDTO{UserID: p.UserID, BusinessName: p.BusinessName, Category: p.Category, City: p.City, Status: p.Status, CommissionRate: p.CommissionRate})
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
		logAction(deps, r, "vendor.approve", "vendor", id, nil)
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
		logAction(deps, r, "vendor.reject", "vendor", id, map[string]any{"reason": req.Reason})
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "vendor ditolak"})
	}
}

type setCommissionRequest struct {
	Rate *float64 `json:"rate"`
}

// setCommission overrides one vendor's commission (PRD §8.10). Pass
// rate: null to clear the override and fall back to the platform default.
func setCommission(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		var req setCommissionRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		if req.Rate != nil && (*req.Rate < 0 || *req.Rate > 1) {
			httpx.Error(w, http.StatusBadRequest, "rate harus antara 0 dan 1 (mis. 0.1 untuk 10%)")
			return
		}
		if err := deps.Vendors.SetCommissionRate(r.Context(), id, req.Rate); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		logAction(deps, r, "vendor.set_commission", "vendor", id, map[string]any{"rate": req.Rate})
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "komisi diperbarui"})
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
		logAction(deps, r, "disbursement.mark_disbursed", "booking", bookingID, nil)
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "dana ditandai sudah dicairkan ke vendor"})
	}
}

type disputeDTO struct {
	ID        string  `json:"id"`
	VendorID  string  `json:"vendor_id"`
	MessageID *string `json:"message_id,omitempty"`
	Reason    string  `json:"reason"`
	CreatedAt string  `json:"created_at"`
}

func listOpenDisputes(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		disputes, err := deps.Disputes.ListOpen(r.Context())
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]disputeDTO, 0, len(disputes))
		for _, d := range disputes {
			out = append(out, disputeDTO{ID: d.ID, VendorID: d.VendorID, MessageID: d.MessageID, Reason: d.Reason, CreatedAt: d.CreatedAt.Format(time.RFC3339)})
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

const (
	sanctionWarning   = "warning"
	sanctionSuspend   = "suspend"
	sanctionTerminate = "terminate"
	sanctionNone      = "none"
)

const suspensionDays = 30

type resolveDisputeRequest struct {
	Sanction string `json:"sanction"`
}

// resolveDispute applies the PRD §11.1 sanction ladder (warning -> suspend
// 30 days -> terminate) to the disputed Vendor's account and closes the
// dispute.
func resolveDispute(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		var req resolveDisputeRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}

		dispute, err := deps.Disputes.GetByID(r.Context(), id)
		if err != nil {
			httpx.Error(w, http.StatusNotFound, "sengketa tidak ditemukan")
			return
		}

		switch req.Sanction {
		case sanctionWarning, sanctionNone:
			// recorded on the dispute only — no account change
		case sanctionSuspend:
			until := time.Now().Add(suspensionDays * 24 * time.Hour)
			if err := deps.Users.SetAccountStatus(r.Context(), dispute.VendorID, repository.AccountStatusSuspended, &until); err != nil {
				httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
				return
			}
		case sanctionTerminate:
			if err := deps.Users.SetAccountStatus(r.Context(), dispute.VendorID, repository.AccountStatusTerminated, nil); err != nil {
				httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
				return
			}
		default:
			httpx.Error(w, http.StatusBadRequest, "sanksi tidak valid")
			return
		}

		if err := deps.Disputes.Resolve(r.Context(), id, req.Sanction); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		logAction(deps, r, "dispute.resolve", "dispute", id, map[string]any{"sanction": req.Sanction})
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "sengketa diselesaikan"})
	}
}

type nameChangeRequestDTO struct {
	ID            string `json:"id"`
	VendorID      string `json:"vendor_id"`
	CurrentName   string `json:"current_name"`
	RequestedName string `json:"requested_name"`
	Reason        string `json:"reason"`
	CreatedAt     string `json:"created_at"`
}

func listPendingNameChanges(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		requests, err := deps.NameChange.ListPending(r.Context())
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]nameChangeRequestDTO, 0, len(requests))
		for _, req := range requests {
			out = append(out, nameChangeRequestDTO{
				ID: req.ID, VendorID: req.VendorID, CurrentName: req.CurrentName,
				RequestedName: req.RequestedName, Reason: req.Reason, CreatedAt: req.CreatedAt.Format(time.RFC3339),
			})
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

type resolveNameChangeRequest struct {
	Approve   bool   `json:"approve"`
	AdminNote string `json:"admin_note"`
}

// resolveNameChange approves (applying the requested name to the vendor's
// profile) or rejects a pending vendor_name_change_requests row.
func resolveNameChange(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		var req resolveNameChangeRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}

		nameChange, err := deps.NameChange.GetByID(r.Context(), id)
		if err != nil {
			httpx.Error(w, http.StatusNotFound, "permintaan tidak ditemukan")
			return
		}
		if nameChange.Status != "pending" {
			httpx.Error(w, http.StatusConflict, "permintaan ini sudah diselesaikan")
			return
		}

		status := "rejected"
		if req.Approve {
			status = "approved"
			if err := deps.Vendors.UpdateBusinessName(r.Context(), nameChange.VendorID, nameChange.RequestedName); err != nil {
				httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
				return
			}
		}

		if _, err := deps.NameChange.Resolve(r.Context(), id, status, req.AdminNote); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		logAction(deps, r, "vendor_name_change.resolve", "vendor_name_change", id, map[string]any{"status": status})
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "permintaan ganti nama diselesaikan"})
	}
}

type dashboardDTO struct {
	ActiveVendors       int `json:"active_vendors"`
	OngoingTransactions int `json:"ongoing_transactions"`
	OpenDisputes        int `json:"open_disputes"`
}

func dashboard(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		activeVendors, err := deps.Vendors.CountApproved(r.Context())
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		ongoing, err := deps.Bookings.CountActive(r.Context())
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		openDisputes, err := deps.Disputes.CountOpen(r.Context())
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, dashboardDTO{ActiveVendors: activeVendors, OngoingTransactions: ongoing, OpenDisputes: openDisputes})
	}
}

type auditLogEntryDTO struct {
	ID         string         `json:"id"`
	ActorID    string         `json:"actor_id"`
	ActorRole  string         `json:"actor_role"`
	Action     string         `json:"action"`
	TargetType string         `json:"target_type"`
	TargetID   string         `json:"target_id"`
	Metadata   map[string]any `json:"metadata,omitempty"`
	CreatedAt  string         `json:"created_at"`
}

const auditLogDefaultLimit = 50

func listAuditLog(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit := auditLogDefaultLimit
		if raw := r.URL.Query().Get("limit"); raw != "" {
			if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 200 {
				limit = parsed
			}
		}
		offset := 0
		if raw := r.URL.Query().Get("offset"); raw != "" {
			if parsed, err := strconv.Atoi(raw); err == nil && parsed >= 0 {
				offset = parsed
			}
		}

		entries, err := deps.AuditLog.List(r.Context(), limit, offset)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		out := make([]auditLogEntryDTO, 0, len(entries))
		for _, e := range entries {
			out = append(out, auditLogEntryDTO{
				ID: e.ID, ActorID: e.ActorID, ActorRole: e.ActorRole, Action: e.Action,
				TargetType: e.TargetType, TargetID: e.TargetID, Metadata: e.Metadata,
				CreatedAt: e.CreatedAt.Format(time.RFC3339),
			})
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

// Mount registers /admin/* routes onto r, restricted to the admin role.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	r.Route("/admin", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))
		r.Use(auth.RequireRole(auth.RoleAdmin))

		r.Get("/dashboard", dashboard(deps))

		r.Get("/vendors/pending", listPending(deps))
		r.Get("/vendors/approved", listApproved(deps))
		r.Post("/vendors/{id}/approve", approveVendor(deps))
		r.Post("/vendors/{id}/reject", rejectVendor(deps))
		r.Patch("/vendors/{id}/commission", setCommission(deps))

		r.Get("/disbursements/pending", listPendingDisbursements(deps))
		r.Post("/disbursements/{bookingID}/mark-disbursed", markDisbursed(deps))

		r.Get("/disputes/open", listOpenDisputes(deps))
		r.Post("/disputes/{id}/resolve", resolveDispute(deps))

		r.Get("/vendor-name-changes/pending", listPendingNameChanges(deps))
		r.Post("/vendor-name-changes/{id}/resolve", resolveNameChange(deps))

		r.Get("/audit-log", listAuditLog(deps))
	})
}
