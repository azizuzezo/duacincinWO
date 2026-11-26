package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrSlugTaken is returned when an article slug is already in use.
var ErrSlugTaken = errors.New("article slug taken")

// Article is one admin-written article. Body is a validated ProseMirror
// document (see internal/articles).
type Article struct {
	ID             string
	Slug           string
	Title          string
	Description    string
	Topic          string
	CoverURL       string
	CoverAlt       string
	Body           json.RawMessage
	Status         string
	AuthorName     string
	ReadingMinutes int
	PublishedAt    *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type ArticleRepo struct {
	pool *pgxpool.Pool
}

func NewArticleRepo(pool *pgxpool.Pool) *ArticleRepo { return &ArticleRepo{pool: pool} }

const articleCols = `id, slug, title, description, topic, cover_url, cover_alt, body, status, author_name, reading_minutes, published_at, created_at, updated_at`

func scanArticle(row pgx.Row) (*Article, error) {
	var a Article
	var body []byte
	if err := row.Scan(&a.ID, &a.Slug, &a.Title, &a.Description, &a.Topic, &a.CoverURL, &a.CoverAlt, &body, &a.Status, &a.AuthorName, &a.ReadingMinutes, &a.PublishedAt, &a.CreatedAt, &a.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	a.Body = json.RawMessage(body)
	return &a, nil
}

// SlugExists reports whether slug is used by an article other than excludeID
// (pass "" to check all).
func (r *ArticleRepo) SlugExists(ctx context.Context, slug, excludeID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		select exists(select 1 from articles where slug = $1 and ($2 = '' or id::text <> $2))
	`, slug, excludeID).Scan(&exists)
	return exists, err
}

// ListSummaries returns articles without their body. status "" means all;
// publishedOnly orders by published_at, otherwise by updated_at.
func (r *ArticleRepo) ListSummaries(ctx context.Context, status string, publishedOrder bool, limit, offset int) ([]Article, error) {
	order := "updated_at desc"
	if publishedOrder {
		order = "published_at desc, id"
	}
	rows, err := r.pool.Query(ctx, `
		select id, slug, title, description, topic, cover_url, cover_alt, status, author_name, reading_minutes, published_at, created_at, updated_at
		from articles
		where ($1 = '' or status = $1)
		order by `+order+`
		limit $2 offset $3
	`, status, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Article{}
	for rows.Next() {
		var a Article
		if err := rows.Scan(&a.ID, &a.Slug, &a.Title, &a.Description, &a.Topic, &a.CoverURL, &a.CoverAlt, &a.Status, &a.AuthorName, &a.ReadingMinutes, &a.PublishedAt, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *ArticleRepo) Get(ctx context.Context, id string) (*Article, error) {
	return scanArticle(r.pool.QueryRow(ctx, `select `+articleCols+` from articles where id = $1`, id))
}

func (r *ArticleRepo) GetPublishedBySlug(ctx context.Context, slug string) (*Article, error) {
	return scanArticle(r.pool.QueryRow(ctx, `select `+articleCols+` from articles where slug = $1 and status = 'published'`, slug))
}

func (r *ArticleRepo) Create(ctx context.Context, a *Article, createdBy string) (*Article, error) {
	out, err := scanArticle(r.pool.QueryRow(ctx, `
		insert into articles (slug, title, description, topic, cover_url, cover_alt, body, author_name, reading_minutes, created_by)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		returning `+articleCols,
		a.Slug, a.Title, a.Description, a.Topic, a.CoverURL, a.CoverAlt, []byte(a.Body), a.AuthorName, a.ReadingMinutes, createdBy))
	if isUniqueViolation(err) {
		return nil, ErrSlugTaken
	}
	return out, err
}

// Update replaces every editable field.
func (r *ArticleRepo) Update(ctx context.Context, id string, a *Article) (*Article, error) {
	out, err := scanArticle(r.pool.QueryRow(ctx, `
		update articles set slug = $2, title = $3, description = $4, topic = $5, cover_url = $6, cover_alt = $7,
			body = $8, author_name = $9, reading_minutes = $10, updated_at = now()
		where id = $1
		returning `+articleCols,
		id, a.Slug, a.Title, a.Description, a.Topic, a.CoverURL, a.CoverAlt, []byte(a.Body), a.AuthorName, a.ReadingMinutes))
	if isUniqueViolation(err) {
		return nil, ErrSlugTaken
	}
	return out, err
}

// Publish sets the article live; published_at is only set the first time.
func (r *ArticleRepo) Publish(ctx context.Context, id string) (*Article, error) {
	return scanArticle(r.pool.QueryRow(ctx, `
		update articles set status = 'published', published_at = coalesce(published_at, now()), updated_at = now()
		where id = $1 returning `+articleCols, id))
}

func (r *ArticleRepo) Unpublish(ctx context.Context, id string) (*Article, error) {
	return scanArticle(r.pool.QueryRow(ctx, `
		update articles set status = 'draft', updated_at = now()
		where id = $1 returning `+articleCols, id))
}

func (r *ArticleRepo) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `delete from articles where id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
