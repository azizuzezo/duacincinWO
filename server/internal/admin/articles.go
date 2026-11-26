package admin

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"duacincin/server/internal/articles"
	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

// ArticleImageBucket is the public bucket for images used in articles.
const ArticleImageBucket = "artikel-foto"

const maxArticleImage = 8 << 20

var articleImageTypes = map[string]string{
	"image/jpeg": "jpg",
	"image/png":  "png",
	"image/webp": "webp",
	"image/gif":  "gif",
}

type articleRequest struct {
	Title       string          `json:"title"`
	Slug        string          `json:"slug"`
	Description string          `json:"description"`
	Topic       string          `json:"topic"`
	CoverURL    string          `json:"cover_url"`
	CoverAlt    string          `json:"cover_alt"`
	Body        json.RawMessage `json:"body"`
	AuthorName  string          `json:"author_name"`
}

func articleBadRequest(w http.ResponseWriter, msg string) { httpx.Error(w, http.StatusBadRequest, msg) }

func runeLen(s string) int { return len([]rune(s)) }

// readArticle decodes and validates the editable fields. Returns ok=false
// after writing the error itself. The returned article's Slug is the typed
// slug (empty if none), Body is the validated document or nil when omitted.
func readArticle(w http.ResponseWriter, r *http.Request) (*articleRequest, bool) {
	r.Body = http.MaxBytesReader(w, r.Body, articles.MaxBodyBytes+64<<10)
	var req articleRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			articleBadRequest(w, "isi artikel tidak valid: terlalu besar (maksimal 1 MB)")
			return nil, false
		}
		articleBadRequest(w, "data yang dikirim tidak lengkap, coba lagi")
		return nil, false
	}
	req.Title = strings.TrimSpace(req.Title)
	req.Slug = strings.TrimSpace(req.Slug)
	req.Description = strings.TrimSpace(req.Description)
	req.Topic = strings.TrimSpace(req.Topic)
	req.CoverURL = strings.TrimSpace(req.CoverURL)
	req.CoverAlt = strings.TrimSpace(req.CoverAlt)
	req.AuthorName = strings.TrimSpace(req.AuthorName)

	switch {
	case runeLen(req.Title) < 3 || runeLen(req.Title) > 160:
		articleBadRequest(w, "judul artikel harus 3 sampai 160 karakter")
	case runeLen(req.Description) > 300:
		articleBadRequest(w, "deskripsi artikel maksimal 300 karakter")
	case runeLen(req.Topic) > 60:
		articleBadRequest(w, "topik maksimal 60 karakter")
	case runeLen(req.CoverAlt) > 300:
		articleBadRequest(w, "teks alternatif sampul maksimal 300 karakter")
	case runeLen(req.AuthorName) > 100:
		articleBadRequest(w, "nama penulis maksimal 100 karakter")
	case req.CoverURL != "" && (len(req.CoverURL) > 2000 || !(strings.HasPrefix(req.CoverURL, "https://") || articles.LocalHTTP(req.CoverURL) || (strings.HasPrefix(req.CoverURL, "/") && !strings.HasPrefix(req.CoverURL, "//")))):
		articleBadRequest(w, "alamat sampul harus diawali https:// atau /")
	case req.Slug != "" && (len(req.Slug) < articles.MinSlug || len(req.Slug) > articles.MaxSlug || !articles.SlugRe.MatchString(req.Slug)):
		articleBadRequest(w, "alamat artikel harus 3 sampai 80 karakter huruf kecil, angka, dan tanda hubung")
	default:
		if len(req.Body) > 0 && string(req.Body) != "null" {
			body, err := articles.ValidateBody(req.Body)
			if err != nil {
				articleBadRequest(w, err.Error())
				return nil, false
			}
			req.Body = body
		} else {
			req.Body = nil
		}
		return &req, true
	}
	return nil, false
}

func articleNotFound(w http.ResponseWriter) {
	httpx.Error(w, http.StatusNotFound, "artikel tidak ditemukan")
}

// loadArticle fetches the article named by the {id} URL parameter, writing
// the 404/500 itself on failure.
func loadArticle(deps *Deps, w http.ResponseWriter, r *http.Request) (*repository.Article, bool) {
	id := chi.URLParam(r, "id")
	if _, err := uuid.Parse(id); err != nil {
		articleNotFound(w)
		return nil, false
	}
	a, err := deps.Articles.Get(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		articleNotFound(w)
		return nil, false
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
		return nil, false
	}
	return a, true
}

func listArticles(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status := r.URL.Query().Get("status")
		if status != "" && status != "draft" && status != "published" {
			articleBadRequest(w, "status harus draft atau published")
			return
		}
		items, err := deps.Articles.ListSummaries(r.Context(), status, false, 1000, 0)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]articles.DTO, 0, len(items))
		for i := range items {
			out = append(out, articles.ToDTO(&items[i], false))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

func getArticle(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		a, ok := loadArticle(deps, w, r)
		if !ok {
			return
		}
		httpx.JSON(w, http.StatusOK, articles.ToDTO(a, true))
	}
}

func createArticle(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}
		req, ok := readArticle(w, r)
		if !ok {
			return
		}
		body := req.Body
		if body == nil {
			body = articles.EmptyBody
		}
		author := req.AuthorName
		if author == "" {
			if u, err := deps.Users.GetByID(r.Context(), claims.UserID); err == nil {
				author = u.FullName
			}
		}
		a := &repository.Article{Title: req.Title, Description: req.Description, Topic: req.Topic, CoverURL: req.CoverURL, CoverAlt: req.CoverAlt,
			Body: body, AuthorName: author, ReadingMinutes: articles.ReadingMinutes(body)}

		var created *repository.Article
		var err error
		if req.Slug != "" {
			a.Slug = req.Slug
			created, err = deps.Articles.Create(r.Context(), a, claims.UserID)
		} else {
			base := articles.DeriveSlug(req.Title)
			for n := 1; n <= 50; n++ {
				a.Slug = articles.SlugWithSuffix(base, n)
				if taken, qerr := deps.Articles.SlugExists(r.Context(), a.Slug, ""); qerr != nil {
					err = qerr
					break
				} else if taken {
					continue
				}
				created, err = deps.Articles.Create(r.Context(), a, claims.UserID)
				if errors.Is(err, repository.ErrSlugTaken) {
					continue
				}
				break
			}
		}
		if errors.Is(err, repository.ErrSlugTaken) {
			httpx.Error(w, http.StatusConflict, "alamat artikel sudah dipakai")
			return
		}
		if err != nil || created == nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		logAction(deps, r, "article.create", "article", created.ID, map[string]any{"title": created.Title, "slug": created.Slug})
		httpx.JSON(w, http.StatusCreated, articles.ToDTO(created, true))
	}
}

func updateArticle(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		current, ok := loadArticle(deps, w, r)
		if !ok {
			return
		}
		req, ok := readArticle(w, r)
		if !ok {
			return
		}
		next := &repository.Article{Slug: current.Slug, Title: req.Title, Description: req.Description, Topic: req.Topic, CoverURL: req.CoverURL, CoverAlt: req.CoverAlt,
			Body: current.Body, AuthorName: req.AuthorName}
		if req.Slug != "" {
			next.Slug = req.Slug
		}
		if req.Body != nil {
			next.Body = req.Body
		}
		if next.AuthorName == "" {
			next.AuthorName = current.AuthorName
		}
		next.ReadingMinutes = articles.ReadingMinutes(next.Body)

		if next.Slug != current.Slug {
			taken, err := deps.Articles.SlugExists(r.Context(), next.Slug, current.ID)
			if err != nil {
				httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
				return
			}
			if taken {
				httpx.Error(w, http.StatusConflict, "alamat artikel sudah dipakai")
				return
			}
		}
		updated, err := deps.Articles.Update(r.Context(), current.ID, next)
		if errors.Is(err, repository.ErrSlugTaken) {
			httpx.Error(w, http.StatusConflict, "alamat artikel sudah dipakai")
			return
		}
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		logAction(deps, r, "article.update", "article", updated.ID, map[string]any{"title": updated.Title, "slug": updated.Slug})
		httpx.JSON(w, http.StatusOK, articles.ToDTO(updated, true))
	}
}

func publishArticle(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		a, ok := loadArticle(deps, w, r)
		if !ok {
			return
		}
		_, hasContent := articles.Stats(a.Body)
		switch {
		case strings.TrimSpace(a.Title) == "":
			articleBadRequest(w, "judul artikel wajib diisi sebelum diterbitkan")
			return
		case runeLen(strings.TrimSpace(a.Description)) < 20:
			articleBadRequest(w, "deskripsi artikel minimal 20 karakter sebelum diterbitkan")
			return
		case !hasContent:
			articleBadRequest(w, "isi artikel masih kosong, tambahkan teks atau gambar sebelum diterbitkan")
			return
		}
		published, err := deps.Articles.Publish(r.Context(), a.ID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		logAction(deps, r, "article.publish", "article", published.ID, map[string]any{"title": published.Title, "slug": published.Slug})
		httpx.JSON(w, http.StatusOK, articles.ToDTO(published, true))
	}
}

func unpublishArticle(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		a, ok := loadArticle(deps, w, r)
		if !ok {
			return
		}
		draft, err := deps.Articles.Unpublish(r.Context(), a.ID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		logAction(deps, r, "article.unpublish", "article", draft.ID, map[string]any{"title": draft.Title, "slug": draft.Slug})
		httpx.JSON(w, http.StatusOK, articles.ToDTO(draft, true))
	}
}

func deleteArticle(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		a, ok := loadArticle(deps, w, r)
		if !ok {
			return
		}
		if err := deps.Articles.Delete(r.Context(), a.ID); err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				articleNotFound(w)
				return
			}
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		logAction(deps, r, "article.delete", "article", a.ID, map[string]any{"title": a.Title, "slug": a.Slug})
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "artikel dihapus"})
	}
}

// uploadArticleImage stores one image (multipart field "file", sniffed type)
// in the public article bucket.
func uploadArticleImage(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if deps.Storage == nil || !deps.Storage.Configured() {
			httpx.Error(w, http.StatusServiceUnavailable, "unggah gambar sedang tidak tersedia, coba lagi nanti")
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, maxArticleImage+1<<20)
		if err := r.ParseMultipartForm(maxArticleImage); err != nil {
			articleBadRequest(w, "file terlalu besar atau bukan gambar (maksimal 8 MB)")
			return
		}
		file, _, err := r.FormFile("file")
		if err != nil {
			articleBadRequest(w, "file tidak ditemukan")
			return
		}
		defer file.Close()
		data, err := io.ReadAll(io.LimitReader(file, maxArticleImage+1))
		if err != nil {
			articleBadRequest(w, "gagal membaca file")
			return
		}
		if len(data) > maxArticleImage {
			articleBadRequest(w, "file terlalu besar (maksimal 8 MB)")
			return
		}
		contentType := http.DetectContentType(data)
		ext, valid := articleImageTypes[contentType]
		if !valid {
			articleBadRequest(w, "tipe file tidak didukung (hanya JPEG, PNG, WEBP, GIF)")
			return
		}
		url, err := deps.Storage.Upload(r.Context(), ArticleImageBucket, uuid.NewString()+"."+ext, contentType, data)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "gagal mengunggah gambar")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"url": url})
	}
}
