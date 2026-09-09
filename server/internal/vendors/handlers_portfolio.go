package vendors

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/imageupload"
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
