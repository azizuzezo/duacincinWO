package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type InspirationItem struct {
	ID           string
	Category     string
	StoragePath  string
	PublicURL    string
	AltText      string
	Caption      string
	SourceCredit string
	ExternalRef  *string
	CreatedAt    time.Time
}

type InspirationRepo struct {
	pool *pgxpool.Pool
}

func NewInspirationRepo(pool *pgxpool.Pool) *InspirationRepo {
	return &InspirationRepo{pool: pool}
}

func (r *InspirationRepo) Create(ctx context.Context, category, storagePath, publicURL, altText, caption, sourceCredit string) (*InspirationItem, error) {
	row := r.pool.QueryRow(ctx, `
		insert into inspiration_items (category, storage_path, public_url, alt_text, caption, source_credit)
		values ($1, $2, $3, $4, $5, $6)
		returning id, category, storage_path, public_url, alt_text, caption, source_credit, external_ref, created_at
	`, category, storagePath, publicURL, altText, caption, sourceCredit)
	return scanInspirationItem(row)
}

// CreateFromExternal is like Create but also records where the item came
// from (e.g. "pinterest:<pin_id>"), so a repeated sync from that source
// never imports the same item twice (see ExistingExternalRefs).
func (r *InspirationRepo) CreateFromExternal(ctx context.Context, category, storagePath, publicURL, altText, caption, externalRef string) (*InspirationItem, error) {
	row := r.pool.QueryRow(ctx, `
		insert into inspiration_items (category, storage_path, public_url, alt_text, caption, source_credit, external_ref)
		values ($1, $2, $3, $4, $5, '', $6)
		returning id, category, storage_path, public_url, alt_text, caption, source_credit, external_ref, created_at
	`, category, storagePath, publicURL, altText, caption, externalRef)
	return scanInspirationItem(row)
}

// ExistingExternalRefs returns every external_ref already imported, so a
// sync can skip pins it has already brought in before.
func (r *InspirationRepo) ExistingExternalRefs(ctx context.Context) (map[string]bool, error) {
	rows, err := r.pool.Query(ctx, `select external_ref from inspiration_items where external_ref is not null`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	refs := make(map[string]bool)
	for rows.Next() {
		var ref string
		if err := rows.Scan(&ref); err != nil {
			return nil, err
		}
		refs[ref] = true
	}
	return refs, rows.Err()
}

// List returns published inspiration items, optionally filtered by
// category and a simple text search over caption/category (PRD §8.7:
// "filter & search sederhana").
func (r *InspirationRepo) List(ctx context.Context, category, query string) ([]InspirationItem, error) {
	rows, err := r.pool.Query(ctx, `
		select id, category, storage_path, public_url, alt_text, caption, source_credit, external_ref, created_at
		from inspiration_items
		where ($1 = '' or category = $1)
		  and ($2 = '' or category ilike '%' || $2 || '%' or caption ilike '%' || $2 || '%')
		order by created_at desc
	`, category, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []InspirationItem
	for rows.Next() {
		var it InspirationItem
		if err := rows.Scan(&it.ID, &it.Category, &it.StoragePath, &it.PublicURL, &it.AltText, &it.Caption, &it.SourceCredit, &it.ExternalRef, &it.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (r *InspirationRepo) GetByID(ctx context.Context, id string) (*InspirationItem, error) {
	row := r.pool.QueryRow(ctx, `
		select id, category, storage_path, public_url, alt_text, caption, source_credit, external_ref, created_at
		from inspiration_items where id = $1
	`, id)
	item, err := scanInspirationItem(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return item, err
}

func (r *InspirationRepo) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `delete from inspiration_items where id = $1`, id)
	return err
}

// DistinctCategories lists every category currently in use, for the
// gallery's filter chips.
func (r *InspirationRepo) DistinctCategories(ctx context.Context) ([]string, error) {
	rows, err := r.pool.Query(ctx, `select distinct category from inspiration_items order by category`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []string
	for rows.Next() {
		var c string
		if err := rows.Scan(&c); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	return categories, rows.Err()
}

func scanInspirationItem(row pgx.Row) (*InspirationItem, error) {
	var it InspirationItem
	if err := row.Scan(&it.ID, &it.Category, &it.StoragePath, &it.PublicURL, &it.AltText, &it.Caption, &it.SourceCredit, &it.ExternalRef, &it.CreatedAt); err != nil {
		return nil, err
	}
	return &it, nil
}
