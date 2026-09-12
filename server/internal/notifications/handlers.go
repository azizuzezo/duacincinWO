package notifications

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

type notificationDTO struct {
	ID        string  `json:"id"`
	Type      string  `json:"type"`
	Title     string  `json:"title"`
	Body      string  `json:"body"`
	Link      *string `json:"link,omitempty"`
	Read      bool    `json:"read"`
	CreatedAt string  `json:"created_at"`
}

func toNotificationDTO(n *repository.Notification) notificationDTO {
	return notificationDTO{
		ID: n.ID, Type: n.Type, Title: n.Title, Body: n.Body, Link: n.Link,
		Read: n.ReadAt != nil, CreatedAt: n.CreatedAt.Format(time.RFC3339),
	}
}

const defaultLimit = 30

func List(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		limit := defaultLimit
		if raw := r.URL.Query().Get("limit"); raw != "" {
			if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 100 {
				limit = parsed
			}
		}

		items, err := deps.Notifications.ListForUser(r.Context(), claims.UserID, limit)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]notificationDTO, 0, len(items))
		for _, n := range items {
			out = append(out, toNotificationDTO(&n))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

func UnreadCount(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		count, err := deps.Notifications.CountUnread(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]int{"unread": count})
	}
}

func MarkRead(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		id := chi.URLParam(r, "id")
		if err := deps.Notifications.MarkRead(r.Context(), claims.UserID, id); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "ditandai sudah dibaca"})
	}
}

func MarkAllRead(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		if err := deps.Notifications.MarkAllRead(r.Context(), claims.UserID); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "semua ditandai sudah dibaca"})
	}
}
