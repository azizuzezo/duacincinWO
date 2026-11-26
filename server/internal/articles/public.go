package articles

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

const cacheControl = "public, max-age=60, stale-while-revalidate=300"

// DTO is the JSON shape of an article. Body is only set for full articles.
type DTO struct {
	ID             string          `json:"id"`
	Slug           string          `json:"slug"`
	Title          string          `json:"title"`
	Description    string          `json:"description"`
	Topic          string          `json:"topic"`
	CoverURL       string          `json:"cover_url"`
	CoverAlt       string          `json:"cover_alt"`
	Status         string          `json:"status"`
	AuthorName     string          `json:"author_name"`
	ReadingMinutes int             `json:"reading_minutes"`
	PublishedAt    *time.Time      `json:"published_at"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
	Body           json.RawMessage `json:"body,omitempty"`
}

func ToDTO(a *repository.Article, withBody bool) DTO {
	d := DTO{ID: a.ID, Slug: a.Slug, Title: a.Title, Description: a.Description, Topic: a.Topic, CoverURL: a.CoverURL, CoverAlt: a.CoverAlt,
		Status: a.Status, AuthorName: a.AuthorName, ReadingMinutes: a.ReadingMinutes, PublishedAt: a.PublishedAt, CreatedAt: a.CreatedAt, UpdatedAt: a.UpdatedAt}
	if withBody {
		d.Body = a.Body
	}
	return d
}

type Deps struct {
	Articles *repository.ArticleRepo
}

func NewDeps(repo *repository.ArticleRepo) *Deps { return &Deps{Articles: repo} }

// Mount registers the public, unauthenticated article routes.
func Mount(r chi.Router, deps *Deps) {
	r.Get("/articles", list(deps))
	r.Get("/articles/{slug}", get(deps))
}

func list(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, offset := 50, 0
		if v, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && v > 0 {
			limit = min(v, 100)
		}
		if v, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && v > 0 {
			offset = v
		}
		items, err := deps.Articles.ListSummaries(r.Context(), "published", true, limit, offset)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]DTO, 0, len(items))
		for i := range items {
			out = append(out, ToDTO(&items[i], false))
		}
		w.Header().Set("Cache-Control", cacheControl)
		httpx.JSON(w, http.StatusOK, out)
	}
}

func get(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		a, err := deps.Articles.GetPublishedBySlug(r.Context(), chi.URLParam(r, "slug"))
		if errors.Is(err, repository.ErrNotFound) {
			httpx.Error(w, http.StatusNotFound, "artikel tidak ditemukan")
			return
		}
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		w.Header().Set("Cache-Control", cacheControl)
		httpx.JSON(w, http.StatusOK, ToDTO(a, true))
	}
}
