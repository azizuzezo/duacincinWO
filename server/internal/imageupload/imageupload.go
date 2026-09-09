// Package imageupload validates a single-image multipart upload the same
// way everywhere it happens (vendor portfolio, Inspirasi gallery): content
// type sniffed from the actual bytes — never trusting the filename/extension
// — and a fixed size cap (PRD §10.2).
package imageupload

import (
	"io"
	"net/http"

	"duacincin/server/internal/httpx"
)

const MaxBytes = 5 << 20 // 5 MB

var AllowedTypes = map[string]string{
	"image/jpeg": "jpg",
	"image/png":  "png",
	"image/webp": "webp",
}

// Read parses formField as a single image from a multipart request. On
// failure it writes the appropriate HTTP error itself and returns ok=false.
func Read(w http.ResponseWriter, r *http.Request, formField string) (data []byte, contentType, ext string, ok bool) {
	r.Body = http.MaxBytesReader(w, r.Body, MaxBytes+1<<20)
	if err := r.ParseMultipartForm(MaxBytes); err != nil {
		httpx.Error(w, http.StatusBadRequest, "file terlalu besar atau tidak valid (maks 5MB)")
		return nil, "", "", false
	}

	file, _, err := r.FormFile(formField)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "file tidak ditemukan")
		return nil, "", "", false
	}
	defer file.Close()

	data, err = io.ReadAll(io.LimitReader(file, MaxBytes+1))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "gagal membaca file")
		return nil, "", "", false
	}
	if len(data) > MaxBytes {
		httpx.Error(w, http.StatusBadRequest, "file terlalu besar (maks 5MB)")
		return nil, "", "", false
	}

	contentType = http.DetectContentType(data)
	ext, valid := AllowedTypes[contentType]
	if !valid {
		httpx.Error(w, http.StatusBadRequest, "tipe file tidak didukung (hanya JPEG/PNG/WEBP)")
		return nil, "", "", false
	}

	return data, contentType, ext, true
}
