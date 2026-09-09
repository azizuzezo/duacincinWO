package vendors

import (
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
)

const maxPortfolioImageBytes = 5 << 20 // 5 MB

var allowedImageTypes = map[string]string{
	"image/jpeg": "jpg",
	"image/png":  "png",
	"image/webp": "webp",
}

// UploadPortfolio accepts a single image (multipart form field "file") and
// stores it in Supabase Storage under the vendor's own folder. Content type
// is sniffed from the actual bytes, not the filename/extension (PRD §10.2).
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

		r.Body = http.MaxBytesReader(w, r.Body, maxPortfolioImageBytes+1<<20)
		if err := r.ParseMultipartForm(maxPortfolioImageBytes); err != nil {
			httpx.Error(w, http.StatusBadRequest, "file terlalu besar atau tidak valid (maks 5MB)")
			return
		}

		file, _, err := r.FormFile("file")
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "file tidak ditemukan")
			return
		}
		defer file.Close()

		data, err := io.ReadAll(io.LimitReader(file, maxPortfolioImageBytes+1))
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "gagal membaca file")
			return
		}
		if len(data) > maxPortfolioImageBytes {
			httpx.Error(w, http.StatusBadRequest, "file terlalu besar (maks 5MB)")
			return
		}

		contentType := http.DetectContentType(data)
		ext, ok := allowedImageTypes[contentType]
		if !ok {
			httpx.Error(w, http.StatusBadRequest, "tipe file tidak didukung (hanya JPEG/PNG/WEBP)")
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
