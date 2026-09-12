package booking

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgconn"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

type submitReviewRequest struct {
	Rating  int    `json:"rating"`
	Comment string `json:"comment"`
}

type reviewDTO struct {
	ID        string  `json:"id"`
	Rating    int     `json:"rating"`
	Comment   *string `json:"comment,omitempty"`
	CreatedAt string  `json:"created_at"`
}

// SubmitReview lets the Client who owns a completed booking leave a
// one-time rating/comment for the Vendor. One review per booking: a
// second attempt fails on the reviews.booking_id unique constraint.
func SubmitReview(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		b, err := deps.Bookings.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || claims.UserID != b.ClientID {
			httpx.Error(w, http.StatusNotFound, "booking tidak ditemukan")
			return
		}
		if b.Status != repository.BookingStatusCompleted {
			httpx.Error(w, http.StatusConflict, "booking harus selesai dulu sebelum bisa direview")
			return
		}

		var req submitReviewRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		if req.Rating < 1 || req.Rating > 5 {
			httpx.Error(w, http.StatusBadRequest, "rating harus antara 1 dan 5")
			return
		}

		var comment *string
		if trimmed := strings.TrimSpace(req.Comment); trimmed != "" {
			comment = &trimmed
		}

		rev, err := deps.Reviews.Create(r.Context(), b.ID, claims.UserID, b.VendorID, req.Rating, comment)
		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation {
				httpx.Error(w, http.StatusConflict, "booking ini sudah direview")
				return
			}
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		notify(deps, r.Context(), b.VendorID, "review.received", "Ulasan baru diterima", fmt.Sprintf("Rating %d bintang untuk booking-mu.", rev.Rating), "/vendor/profile")

		httpx.JSON(w, http.StatusCreated, reviewDTO{ID: rev.ID, Rating: rev.Rating, Comment: rev.Comment, CreatedAt: rev.CreatedAt.Format("2006-01-02T15:04:05Z07:00")})
	}
}
