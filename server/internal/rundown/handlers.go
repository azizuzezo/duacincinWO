package rundown

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

var timePattern = regexp.MustCompile(`^([01]\d|2[0-3]):[0-5]\d$`)

type itemDTO struct {
	ID        string `json:"id"`
	StartTime string `json:"start_time"`
	Title     string `json:"title"`
	Notes     string `json:"notes"`
}

func toItemDTO(it *repository.RundownItem) itemDTO {
	return itemDTO{ID: it.ID, StartTime: it.StartTime, Title: it.Title, Notes: it.Notes}
}

func ListItems(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		items, err := deps.Rundown.ListForClient(r.Context(), claims.UserID)
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

type upsertItemRequest struct {
	StartTime string `json:"start_time"`
	Title     string `json:"title"`
	Notes     string `json:"notes"`
}

func validate(req *upsertItemRequest) bool {
	req.Title = strings.TrimSpace(req.Title)
	return req.Title != "" && timePattern.MatchString(req.StartTime)
}

func CreateItem(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		var req upsertItemRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil || !validate(&req) {
			httpx.Error(w, http.StatusBadRequest, "jam (HH:MM) dan judul wajib diisi")
			return
		}

		item, err := deps.Rundown.Create(r.Context(), claims.UserID, req.StartTime, req.Title, strings.TrimSpace(req.Notes))
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusCreated, toItemDTO(item))
	}
}

func UpdateItem(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		id := chi.URLParam(r, "id")

		var req upsertItemRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil || !validate(&req) {
			httpx.Error(w, http.StatusBadRequest, "jam (HH:MM) dan judul wajib diisi")
			return
		}

		found, err := deps.Rundown.Update(r.Context(), claims.UserID, id, req.StartTime, req.Title, strings.TrimSpace(req.Notes))
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !found {
			httpx.Error(w, http.StatusNotFound, "jadwal tidak ditemukan")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "jadwal diperbarui"})
	}
}

func DeleteItem(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		found, err := deps.Rundown.Delete(r.Context(), claims.UserID, chi.URLParam(r, "id"))
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !found {
			httpx.Error(w, http.StatusNotFound, "jadwal tidak ditemukan")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "jadwal dihapus"})
	}
}
