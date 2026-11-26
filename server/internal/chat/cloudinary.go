package chat

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
	"duacincin/server/internal/httpx"
)

const mb = 1 << 20

// attachmentSpec describes one allowed attachment mime type.
type attachmentSpec struct {
	Kind         string // "image", "video" or "document"
	ResourceType string // Cloudinary resource_type: image, video or raw
	MaxBytes     int64
	Label        string // used in the size error: "foto", "video", "dokumen"
	Ext          string // appended to public_id for raw files
}

var (
	imageSpec = attachmentSpec{"image", "image", 15 * mb, "foto", ""}
	videoSpec = attachmentSpec{"video", "video", 100 * mb, "video", ""}
	docSpec   = attachmentSpec{"document", "raw", 25 * mb, "dokumen", ""}
)

func withExt(s attachmentSpec, ext string) attachmentSpec { s.Ext = ext; return s }

// attachmentTypes is the allow-list. Anything not here (zip, executables,
// svg, html...) is refused.
var attachmentTypes = map[string]attachmentSpec{
	"image/jpeg":      imageSpec,
	"image/png":       imageSpec,
	"image/webp":      imageSpec,
	"image/gif":       imageSpec,
	"video/mp4":       videoSpec,
	"video/quicktime": videoSpec,
	"video/webm":      videoSpec,

	"application/pdf":    withExt(docSpec, "pdf"),
	"application/msword": withExt(docSpec, "doc"),
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": withExt(docSpec, "docx"),
	"application/vnd.ms-excel": withExt(docSpec, "xls"),
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         withExt(docSpec, "xlsx"),
	"application/vnd.ms-powerpoint":                                             withExt(docSpec, "ppt"),
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": withExt(docSpec, "pptx"),
	"text/plain": withExt(docSpec, "txt"),
	"text/csv":   withExt(docSpec, "csv"),
}

const (
	msgUnsupportedFile    = "Jenis file ini belum didukung."
	msgFileEmpty          = "File kosong atau ukurannya tidak valid."
	msgAttachmentNotReady = "Penyimpanan lampiran belum dikonfigurasi."
	msgBadAttachmentURL   = "Lampiran tidak valid."
)

// checkAttachment validates a mime type and size; it returns the spec or an
// Indonesian error message.
func checkAttachment(mime string, size int64) (attachmentSpec, string) {
	spec, ok := attachmentTypes[strings.ToLower(strings.TrimSpace(mime))]
	if !ok {
		return attachmentSpec{}, msgUnsupportedFile
	}
	if size <= 0 {
		return attachmentSpec{}, msgFileEmpty
	}
	if size > spec.MaxBytes {
		return attachmentSpec{}, fmt.Sprintf("Ukuran file maksimal %d MB untuk %s.", spec.MaxBytes/mb, spec.Label)
	}
	return spec, ""
}

// cloudinaryConfigured reports whether all three credentials are set.
func cloudinaryConfigured(cfg *config.Config) bool {
	return cfg != nil && cfg.CloudinaryCloudName != "" && cfg.CloudinaryAPIKey != "" && cfg.CloudinaryAPISecret != ""
}

// cloudinarySignature is Cloudinary's upload signature: SHA-1 (hex) of the
// signed params sorted by name and joined as k=v&k=v, with the API secret
// appended. Empty values are skipped, as Cloudinary does.
func cloudinarySignature(params map[string]string, secret string) string {
	keys := make([]string, 0, len(params))
	for k, v := range params {
		if v != "" {
			keys = append(keys, k)
		}
	}
	sort.Strings(keys)
	parts := make([]string, len(keys))
	for i, k := range keys {
		parts[i] = k + "=" + params[k]
	}
	sum := sha1.Sum([]byte(strings.Join(parts, "&") + secret))
	return hex.EncodeToString(sum[:])
}

func chatFolder(conversationID string) string { return "duacincin/chat/" + conversationID }

type signAttachmentRequest struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Size int64  `json:"size"`
}

type signAttachmentResponse struct {
	UploadURL    string            `json:"upload_url"`
	Fields       map[string]string `json:"fields"`
	ResourceType string            `json:"resource_type"`
	MaxBytes     int64             `json:"max_bytes"`
	Kind         string            `json:"kind"`
}

// SignAttachment hands the browser a one-off signed Cloudinary upload, so
// big files go browser -> Cloudinary and never through this API (serverless
// request bodies are capped at a few MB). Order: auth, participant, open
// conversation, validation, then configuration.
func SignAttachment(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		conv, err := deps.Chat.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || !canAccess(claims, conv) {
			httpx.Error(w, http.StatusNotFound, "percakapan tidak ditemukan")
			return
		}
		if conv.Closed() {
			httpx.Error(w, http.StatusConflict, msgSessionClosed)
			return
		}
		var req signAttachmentRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}
		spec, msg := checkAttachment(req.Type, req.Size)
		if msg != "" {
			httpx.Error(w, http.StatusBadRequest, msg)
			return
		}
		if !cloudinaryConfigured(deps.Cfg) {
			httpx.Error(w, http.StatusServiceUnavailable, msgAttachmentNotReady)
			return
		}

		// The folder is part of public_id (not sent as a separate folder
		// field) so the delivery URL contains it whether the account uses
		// fixed or dynamic folders. Raw files keep their extension.
		publicID := chatFolder(conv.ID) + "/" + uuid.NewString()
		if spec.Ext != "" {
			publicID += "." + spec.Ext
		}
		params := map[string]string{
			"public_id": publicID,
			"timestamp": strconv.FormatInt(time.Now().Unix(), 10),
		}
		fields := map[string]string{
			"api_key":   deps.Cfg.CloudinaryAPIKey,
			"signature": cloudinarySignature(params, deps.Cfg.CloudinaryAPISecret),
		}
		for k, v := range params {
			fields[k] = v
		}
		httpx.JSON(w, http.StatusOK, signAttachmentResponse{
			UploadURL:    fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/%s/upload", deps.Cfg.CloudinaryCloudName, spec.ResourceType),
			Fields:       fields,
			ResourceType: spec.ResourceType,
			MaxBytes:     spec.MaxBytes,
			Kind:         spec.Kind,
		})
	}
}

// cloudinaryURLOK reports whether raw is a Cloudinary delivery URL of this
// account, inside this conversation's folder, with a resource type matching
// the declared mime type.
func cloudinaryURLOK(cfg *config.Config, conversationID, raw string, spec attachmentSpec) bool {
	if cfg == nil || cfg.CloudinaryCloudName == "" {
		return false
	}
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Host != "res.cloudinary.com" || u.User != nil {
		return false
	}
	prefix := "/" + cfg.CloudinaryCloudName + "/"
	if !strings.HasPrefix(u.Path, prefix) || strings.Contains(u.Path, "..") {
		return false
	}
	if !strings.Contains(u.Path, "/"+chatFolder(conversationID)+"/") {
		return false
	}
	parts := strings.Split(strings.TrimPrefix(u.Path, "/"), "/")
	return len(parts) >= 3 && parts[1] == spec.ResourceType
}

// legacyURLOK reports whether raw is what the multipart UploadAttachment
// produces for this conversation (Supabase public bucket URL).
func legacyURLOK(cfg *config.Config, conversationID, raw string) bool {
	if cfg == nil || cfg.SupabaseURL == "" {
		return false
	}
	prefix := strings.TrimRight(cfg.SupabaseURL, "/") + "/storage/v1/object/public/" + AttachmentBucket + "/" + conversationID + "/"
	return strings.HasPrefix(raw, prefix) && !strings.Contains(raw, "..")
}

// validateAttachmentRef checks the attachment fields of SendMessage and
// returns an Indonesian error message, or "" when fine.
func validateAttachmentRef(cfg *config.Config, conversationID, rawURL string, mime *string) string {
	if mime == nil {
		return msgUnsupportedFile
	}
	spec, ok := attachmentTypes[strings.ToLower(strings.TrimSpace(*mime))]
	if !ok {
		return msgUnsupportedFile
	}
	if legacyURLOK(cfg, conversationID, rawURL) && spec.Kind == "image" {
		return ""
	}
	if cloudinaryURLOK(cfg, conversationID, rawURL, spec) {
		return ""
	}
	return msgBadAttachmentURL
}

// sanitizeAttachmentName drops path separators and control characters and
// caps the name at 200 characters.
func sanitizeAttachmentName(name *string) string {
	if name == nil {
		return ""
	}
	cleaned := strings.Map(func(r rune) rune {
		if r == '/' || r == '\\' || unicode.IsControl(r) {
			return -1
		}
		return r
	}, *name)
	cleaned = strings.TrimLeft(strings.TrimSpace(cleaned), ".")
	if r := []rune(cleaned); len(r) > 200 {
		cleaned = string(r[:200])
	}
	return cleaned
}
