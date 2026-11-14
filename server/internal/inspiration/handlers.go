package inspiration

import (
	"errors"
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
	// Vendors who worked on the wedding in this photo (always an array, so
	// the gallery never has to guard against null).
	Vendors []vendorTagDTO `json:"vendors"`
}

type vendorTagDTO struct {
	ID           string `json:"id"`
	BusinessName string `json:"business_name"`
	Category     string `json:"category"`
	City         string `json:"city"`
}

func toVendorTagDTOs(tags []repository.InspirationVendorTag) []vendorTagDTO {
	out := make([]vendorTagDTO, 0, len(tags))
	for _, t := range tags {
		out = append(out, vendorTagDTO{ID: t.VendorID, BusinessName: t.BusinessName, Category: t.Category, City: t.City})
	}
	return out
}

func toItemDTO(it *repository.InspirationItem) itemDTO {
	dto := itemDTO{
		ID:           it.ID,
		Category:     it.Category,
		URL:          it.PublicURL,
		AltText:      it.AltText,
		Caption:      it.Caption,
		SourceCredit: it.SourceCredit,
		Vendors:      []vendorTagDTO{},
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

		ids := make([]string, 0, len(items))
		for _, it := range items {
			ids = append(ids, it.ID)
		}
		tags, err := deps.Inspiration.VendorTagsByItem(r.Context(), ids)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		out := make([]itemDTO, 0, len(items))
		for _, it := range items {
			dto := toItemDTO(&it)
			dto.Vendors = toVendorTagDTOs(tags[it.ID])
			out = append(out, dto)
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
			httpx.Error(w, http.StatusServiceUnavailable, "unggah foto sedang tidak tersedia, coba lagi nanti")
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

// MaxVendorTags caps how many vendors one photo can credit: a wedding has
// at most one vendor per category plus a few extras, and a longer list stops
// being readable in the lightbox.
const MaxVendorTags = 10

type setVendorsRequest struct {
	VendorIDs []string `json:"vendor_ids"`
}

// SetVendors replaces the vendors tagged on one photo (Admin only). Sending
// an empty list removes every tag. Each ID must be an approved vendor.
func SetVendors(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		if _, err := uuid.Parse(id); err != nil {
			httpx.Error(w, http.StatusNotFound, "item tidak ditemukan")
			return
		}

		var req setVendorsRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}

		seen := make(map[string]bool, len(req.VendorIDs))
		vendorIDs := make([]string, 0, len(req.VendorIDs))
		for _, raw := range req.VendorIDs {
			parsed, err := uuid.Parse(strings.TrimSpace(raw))
			if err != nil {
				httpx.Error(w, http.StatusBadRequest, "vendor tidak valid")
				return
			}
			if v := parsed.String(); !seen[v] {
				seen[v] = true
				vendorIDs = append(vendorIDs, v)
			}
		}
		if len(vendorIDs) > MaxVendorTags {
			httpx.Error(w, http.StatusBadRequest, fmt.Sprintf("maksimal %d vendor per foto", MaxVendorTags))
			return
		}

		item, err := deps.Inspiration.GetByID(r.Context(), id)
		if err != nil {
			httpx.Error(w, http.StatusNotFound, "item tidak ditemukan")
			return
		}

		if err := deps.Inspiration.SetVendorTags(r.Context(), id, vendorIDs); err != nil {
			if errors.Is(err, repository.ErrVendorNotApproved) {
				httpx.Error(w, http.StatusBadRequest, "hanya vendor yang sudah disetujui yang bisa ditandai")
				return
			}
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		tags, err := deps.Inspiration.VendorTagsByItem(r.Context(), []string{id})
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		logAction(deps, r, "inspiration.set_vendors", "inspiration_item", id, map[string]any{"vendor_ids": vendorIDs})
		dto := toItemDTO(item)
		dto.Vendors = toVendorTagDTOs(tags[id])
		httpx.JSON(w, http.StatusOK, dto)
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
