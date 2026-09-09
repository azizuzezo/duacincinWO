package inspiration

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"duacincin/server/internal/httpx"
	"duacincin/server/internal/imageupload"
	"duacincin/server/internal/repository"
)

type itemDTO struct {
	ID           string `json:"id"`
	Category     string `json:"category"`
	URL          string `json:"url"`
	AltText      string `json:"alt_text"`
	Caption      string `json:"caption"`
	SourceCredit string `json:"source_credit,omitempty"`
}

func toItemDTO(it *repository.InspirationItem) itemDTO {
	return itemDTO{
		ID:           it.ID,
		Category:     it.Category,
		URL:          it.PublicURL,
		AltText:      it.AltText,
		Caption:      it.Caption,
		SourceCredit: it.SourceCredit,
	}
}

// List is the PUBLIC (no auth required) gallery listing, with simple
// category filter + text search (PRD §8.7).
func List(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		category := r.URL.Query().Get("category")
		q := r.URL.Query().Get("q")

		items, err := deps.Inspiration.List(r.Context(), category, q)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		out := make([]itemDTO, 0, len(items))
		for _, it := range items {
			out = append(out, toItemDTO(&it))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

// Categories lists distinct categories currently published, for filter chips.
func Categories(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		categories, err := deps.Inspiration.DistinctCategories(r.Context())
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, categories)
	}
}

// Upload lets an Admin publish a new Inspirasi item immediately (no
// separate moderation queue in MVP — the Admin uploading it *is* the
// curation step, PRD §8.7).
func Upload(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !deps.Storage.Configured() {
			httpx.Error(w, http.StatusServiceUnavailable, "upload gambar belum tersedia")
			return
		}

		data, contentType, ext, ok := imageupload.Read(w, r, "file")
		if !ok {
			return
		}

		category := strings.TrimSpace(r.FormValue("category"))
		if category == "" {
			httpx.Error(w, http.StatusBadRequest, "kategori wajib diisi")
			return
		}
		altText := strings.TrimSpace(r.FormValue("alt_text"))
		caption := strings.TrimSpace(r.FormValue("caption"))
		sourceCredit := strings.TrimSpace(r.FormValue("source_credit"))

		path := fmt.Sprintf("%s.%s", uuid.NewString(), ext)
		publicURL, err := deps.Storage.Upload(r.Context(), Bucket, path, contentType, data)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "gagal mengunggah gambar")
			return
		}

		item, err := deps.Inspiration.Create(r.Context(), category, path, publicURL, altText, caption, sourceCredit)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusCreated, toItemDTO(item))
	}
}

// Delete removes an item — the extent of "moderation" needed for MVP
// (PRD §8.10's fuller Inspirasi moderation UI lands in Fase 7).
func Delete(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		item, err := deps.Inspiration.GetByID(r.Context(), id)
		if err != nil {
			httpx.Error(w, http.StatusNotFound, "item tidak ditemukan")
			return
		}

		if err := deps.Inspiration.Delete(r.Context(), id); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		if deps.Storage.Configured() {
			_ = deps.Storage.Delete(r.Context(), Bucket, item.StoragePath)
		}

		httpx.JSON(w, http.StatusOK, map[string]string{"message": "item dihapus"})
	}
}
