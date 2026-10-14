package inspiration

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/imageupload"
	"duacincin/server/internal/repository"
)

// logAction records one Admin write to the audit trail — mirrors
// internal/admin's own helper (not shared directly to avoid an import
// cycle back into admin). Best-effort: failures are logged and swallowed
// since the underlying action already succeeded.
func logAction(deps *Deps, r *http.Request, action, targetType, targetID string, metadata map[string]any) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		return
	}
	if err := deps.AuditLog.Create(r.Context(), claims.UserID, claims.Role, action, targetType, targetID, metadata); err != nil {
		log.Printf("audit log: %v", err)
	}
}

type itemDTO struct {
	ID           string `json:"id"`
	Category     string `json:"category"`
	URL          string `json:"url"`
	AltText      string `json:"alt_text"`
	Caption      string `json:"caption"`
	SourceCredit string `json:"source_credit,omitempty"`
	SourceURL    string `json:"source_url,omitempty"`
}

func toItemDTO(it *repository.InspirationItem) itemDTO {
	dto := itemDTO{
		ID:           it.ID,
		Category:     it.Category,
		URL:          it.PublicURL,
		AltText:      it.AltText,
		Caption:      it.Caption,
		SourceCredit: it.SourceCredit,
	}
	if it.ExternalRef != nil {
		if pinID, ok := strings.CutPrefix(*it.ExternalRef, "pinterest:"); ok {
			dto.SourceURL = fmt.Sprintf("https://www.pinterest.com/pin/%s/", pinID)
		}
	}
	return dto
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

		logAction(deps, r, "inspiration.upload", "inspiration_item", item.ID, map[string]any{"category": category})
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

		logAction(deps, r, "inspiration.delete", "inspiration_item", id, nil)
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "item dihapus"})
	}
}
