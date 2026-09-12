package vendors

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

type reviewDTO struct {
	ID        string  `json:"id"`
	Rating    int     `json:"rating"`
	Comment   *string `json:"comment,omitempty"`
	CreatedAt string  `json:"created_at"`
}

func toReviewDTO(rev *repository.Review) reviewDTO {
	return reviewDTO{ID: rev.ID, Rating: rev.Rating, Comment: rev.Comment, CreatedAt: rev.CreatedAt.Format("2006-01-02T15:04:05Z07:00")}
}

// ListVendorReviews is a PUBLIC endpoint (no auth). Reviews are part of the
// vendor's public reputation, same visibility as the directory/profile.
func ListVendorReviews(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		reviews, err := deps.Reviews.ListForVendor(r.Context(), id)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		out := make([]reviewDTO, 0, len(reviews))
		for _, rev := range reviews {
			out = append(out, toReviewDTO(&rev))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}
