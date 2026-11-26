package auth

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"duacincin/server/internal/httpx"
	"duacincin/server/internal/imageupload"
)

// AvatarBucket is the public Supabase Storage bucket for profile pictures.
const AvatarBucket = "foto-profil"

// avatarPath is the object path for a user's picture: their own folder plus a
// random name, so a new upload never overwrites (or is cached as) the old one.
func avatarPath(userID, name, ext string) string {
	return fmt.Sprintf("%s/%s.%s", userID, name, ext)
}

// avatarPathFromURL recovers the object path from a public URL made by
// storage.Client.Upload (".../object/public/<bucket>/<path>"). ok is false
// when the URL does not point into AvatarBucket.
func avatarPathFromURL(url string) (path string, ok bool) {
	_, rest, found := strings.Cut(url, "/object/public/"+AvatarBucket+"/")
	if !found || rest == "" || strings.Contains(rest, "..") {
		return "", false
	}
	return rest, true
}

// removeAvatarObject deletes the stored file behind an old avatar URL. It is
// best-effort: a failure never fails the request.
func removeAvatarObject(deps *Deps, r *http.Request, url string) {
	if url == "" || deps.Storage == nil || !deps.Storage.Configured() {
		return
	}
	if path, ok := avatarPathFromURL(url); ok {
		_ = deps.Storage.Delete(r.Context(), AvatarBucket, path)
	}
}

// UploadAvatar stores a single image (multipart field "file") as the signed-in
// user's profile picture, for any role.
func UploadAvatar(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		if deps.Storage == nil || !deps.Storage.Configured() {
			httpx.Error(w, http.StatusServiceUnavailable, "unggah foto sedang tidak tersedia, coba lagi nanti")
			return
		}

		data, contentType, ext, ok := imageupload.Read(w, r, "file")
		if !ok {
			return
		}

		path := avatarPath(claims.UserID, uuid.NewString(), ext)
		publicURL, err := deps.Storage.Upload(r.Context(), AvatarBucket, path, contentType, data)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "gagal mengunggah gambar")
			return
		}

		previous, err := deps.Users.SetAvatarURL(r.Context(), claims.UserID, publicURL)
		if err != nil {
			_ = deps.Storage.Delete(r.Context(), AvatarBucket, path)
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		removeAvatarObject(deps, r, previous)

		httpx.JSON(w, http.StatusOK, map[string]string{"avatar_url": publicURL})
	}
}

// DeleteAvatar clears the signed-in user's profile picture. Idempotent.
func DeleteAvatar(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		previous, err := deps.Users.SetAvatarURL(r.Context(), claims.UserID, "")
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		removeAvatarObject(deps, r, previous)

		httpx.JSON(w, http.StatusOK, map[string]string{"avatar_url": ""})
	}
}
