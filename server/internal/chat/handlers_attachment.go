package chat

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/imageupload"
)

type attachmentDTO struct {
	URL  string `json:"url"`
	Type string `json:"type"`
}

// UploadAttachment stores one image (multipart field "file") and returns
// its public URL. The caller then calls SendMessage with attachment_url
// set to this URL. Kept as a separate step (rather than accepting the file
// directly on SendMessage) so the existing JSON-body message contract and
// its validation/response handling stay unchanged.
func UploadAttachment(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		conv, err := deps.Chat.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || !canAccess(claims, conv) {
			httpx.Error(w, http.StatusNotFound, "percakapan tidak ditemukan")
			return
		}

		if !deps.Storage.Configured() {
			httpx.Error(w, http.StatusServiceUnavailable, "upload lampiran belum tersedia")
			return
		}

		data, contentType, ext, ok := imageupload.Read(w, r, "file")
		if !ok {
			return
		}

		path := fmt.Sprintf("%s/%s.%s", conv.ID, uuid.NewString(), ext)
		publicURL, err := deps.Storage.Upload(r.Context(), AttachmentBucket, path, contentType, data)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "gagal mengunggah lampiran")
			return
		}

		httpx.JSON(w, http.StatusCreated, attachmentDTO{URL: publicURL, Type: contentType})
	}
}
