package vendors

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/imageupload"
	"duacincin/server/internal/repository"
)

// UploadPortfolio accepts a single image (multipart form field "file") and
// stores it in Supabase Storage under the vendor's own folder.
func UploadPortfolio(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		if !deps.Storage.Configured() {
			httpx.Error(w, http.StatusServiceUnavailable, "upload gambar belum tersedia")
			return
		}

		data, contentType, ext, ok := imageupload.Read(w, r, "file")
		if !ok {
			return
		}

		altText := strings.TrimSpace(r.FormValue("alt_text"))

		path := fmt.Sprintf("%s/%s.%s", claims.UserID, uuid.NewString(), ext)
		publicURL, err := deps.Storage.Upload(r.Context(), PortfolioBucket, path, contentType, data)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "gagal mengunggah gambar")
			return
		}

		item, err := deps.Vendors.AddPortfolioItem(r.Context(), claims.UserID, path, publicURL, altText)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusCreated, portfolioDTO{ID: item.ID, URL: item.PublicURL, AltText: item.AltText})
	}
}

// DeletePortfolio removes one of the authenticated Vendor's own portfolio
// items (IDOR-safe — scoped to vendor_id in the repo query).
func DeletePortfolio(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		id := chi.URLParam(r, "id")
		storagePath, err := deps.Vendors.DeletePortfolioItem(r.Context(), id, claims.UserID)
		if err != nil {
			if err == repository.ErrNotFound {
				httpx.Error(w, http.StatusNotFound, "item portofolio tidak ditemukan")
				return
			}
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		if deps.Storage.Configured() {
			_ = deps.Storage.Delete(r.Context(), PortfolioBucket, storagePath)
		}

		httpx.JSON(w, http.StatusOK, map[string]string{"message": "item portofolio dihapus"})
	}
}
