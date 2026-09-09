package booking

import (
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

type bookingDTO struct {
	ID                 string `json:"id"`
	ClientID           string `json:"client_id"`
	VendorID           string `json:"vendor_id"`
	EventDate          string `json:"event_date"`
	PackageDescription string `json:"package_description"`
	AgreedPrice        int64  `json:"agreed_price"`
	DPAmount           int64  `json:"dp_amount"`
	Status             string `json:"status"`
}

func toBookingDTO(b *repository.Booking) bookingDTO {
	return bookingDTO{
		ID:                 b.ID,
		ClientID:           b.ClientID,
		VendorID:           b.VendorID,
		EventDate:          b.EventDate.Format("2006-01-02"),
		PackageDescription: b.PackageDescription,
		AgreedPrice:        b.AgreedPrice,
		DPAmount:           b.DPAmount,
		Status:             b.Status,
	}
}

type createBookingRequest struct {
	VendorID           string `json:"vendor_id"`
	EventDate          string `json:"event_date"`
	PackageDescription string `json:"package_description"`
	AgreedPrice        int64  `json:"agreed_price"`
}

// Create submits a new booking request (PRD §8.11 step 2) — status
// "requested" until the Vendor confirms.
func Create(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		var req createBookingRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}

		if req.AgreedPrice <= 0 {
			httpx.Error(w, http.StatusBadRequest, "harga yang disepakati harus lebih dari 0")
			return
		}

		eventDate, err := time.Parse("2006-01-02", req.EventDate)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "tanggal acara tidak valid (format YYYY-MM-DD)")
			return
		}

		vendorProfile, err := deps.Vendors.GetByUserID(r.Context(), req.VendorID)
		if err != nil || vendorProfile.Status != "approved" {
			httpx.Error(w, http.StatusBadRequest, "vendor tidak ditemukan")
			return
		}

		dpAmount := int64(math.Round(float64(req.AgreedPrice) * DPPercent))

		b, err := deps.Bookings.Create(r.Context(), claims.UserID, req.VendorID, eventDate, strings.TrimSpace(req.PackageDescription), req.AgreedPrice, dpAmount)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusCreated, toBookingDTO(b))
	}
}

// List returns the authenticated user's bookings, scoped by role.
func List(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		var (
			bookings []repository.Booking
			err      error
		)
		if claims.Role == auth.RoleVendor {
			bookings, err = deps.Bookings.ListForVendor(r.Context(), claims.UserID)
		} else {
			bookings, err = deps.Bookings.ListForClient(r.Context(), claims.UserID)
		}
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		out := make([]bookingDTO, 0, len(bookings))
		for _, b := range bookings {
			out = append(out, toBookingDTO(&b))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

func getAuthorizedBooking(deps *Deps, r *http.Request) (*repository.Booking, bool) {
	claims, _ := auth.ClaimsFromContext(r.Context())
	b, err := deps.Bookings.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		return nil, false
	}
	if claims.UserID != b.ClientID && claims.UserID != b.VendorID {
		return nil, false
	}
	return b, true
}

func Get(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		b, ok := getAuthorizedBooking(deps, r)
		if !ok {
			httpx.Error(w, http.StatusNotFound, "booking tidak ditemukan")
			return
		}
		httpx.JSON(w, http.StatusOK, toBookingDTO(b))
	}
}

// Confirm lets the Vendor accept a requested booking (PRD §8.11 step 2) —
// also auto-completes the matching Wedding Planner task (§8.9).
func Confirm(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		b, err := deps.Bookings.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || claims.UserID != b.VendorID {
			httpx.Error(w, http.StatusNotFound, "booking tidak ditemukan")
			return
		}

		ok, err := deps.Bookings.UpdateStatus(r.Context(), b.ID, repository.BookingStatusRequested, repository.BookingStatusConfirmed)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !ok {
			httpx.Error(w, http.StatusConflict, "booking tidak dalam status yang bisa dikonfirmasi")
			return
		}

		if vendorProfile, err := deps.Vendors.GetByUserID(r.Context(), b.VendorID); err == nil {
			_ = deps.Planner.MarkDoneByCategory(r.Context(), b.ClientID, vendorProfile.Category)
		}

		httpx.JSON(w, http.StatusOK, map[string]string{"message": "booking dikonfirmasi"})
	}
}

// Cancel lets either participant back out while nothing has been paid yet.
func Cancel(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		b, ok := getAuthorizedBooking(deps, r)
		if !ok {
			httpx.Error(w, http.StatusNotFound, "booking tidak ditemukan")
			return
		}

		if b.Status != repository.BookingStatusRequested && b.Status != repository.BookingStatusConfirmed {
			httpx.Error(w, http.StatusConflict, "booking dengan pembayaran berjalan tidak bisa dibatalkan lewat sini")
			return
		}

		if _, err := deps.Bookings.UpdateStatus(r.Context(), b.ID, b.Status, repository.BookingStatusCancelled); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusOK, map[string]string{"message": "booking dibatalkan"})
	}
}

// Complete lets the Client confirm the event happened (PRD §8.11 step 7),
// gated on full payment and at least one technical meeting having been
// scheduled. Creates the pending disbursement for Admin to pay out.
func Complete(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		b, err := deps.Bookings.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || claims.UserID != b.ClientID {
			httpx.Error(w, http.StatusNotFound, "booking tidak ditemukan")
			return
		}

		if b.Status != repository.BookingStatusFullPaid {
			httpx.Error(w, http.StatusConflict, "booking harus lunas dulu sebelum bisa diselesaikan")
			return
		}

		count, err := deps.Meetings.CountForBooking(r.Context(), b.ID, repository.MeetingTypeTechnical)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if count == 0 {
			httpx.Error(w, http.StatusConflict, "technical meeting dengan vendor wajib dijadwalkan dulu sebelum acara bisa diselesaikan")
			return
		}

		ok, err := deps.Bookings.UpdateStatus(r.Context(), b.ID, repository.BookingStatusFullPaid, repository.BookingStatusCompleted)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !ok {
			httpx.Error(w, http.StatusConflict, "booking sudah berubah status, coba muat ulang")
			return
		}

		commission := int64(math.Round(float64(b.AgreedPrice) * CommissionRate))
		net := b.AgreedPrice - commission
		if err := deps.Disbursements.Create(r.Context(), b.ID, b.AgreedPrice, commission, net); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusOK, map[string]string{"message": "booking selesai, menunggu pencairan dana ke vendor"})
	}
}
