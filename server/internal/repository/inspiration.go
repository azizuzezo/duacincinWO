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

// InspirationVendorTag is one vendor credited on an Inspirasi photo. Only
// approved vendors are ever returned, so a vendor that is later suspended
// or rejected quietly drops off every photo it was tagged on.
type InspirationVendorTag struct {
	VendorID     string
	BusinessName string
	Category     string
	City         string
}

// VendorTagsByItem returns the approved vendors tagged on each of the given
// items, keyed by inspiration item ID, in category then name order (one
// query for the whole gallery, not one per photo).
func (r *InspirationRepo) VendorTagsByItem(ctx context.Context, itemIDs []string) (map[string][]InspirationVendorTag, error) {
	out := make(map[string][]InspirationVendorTag)
	if len(itemIDs) == 0 {
		return out, nil
	}
	rows, err := r.pool.Query(ctx, `
		select t.inspiration_id, v.user_id, v.business_name, v.category::text, v.city
		from inspiration_vendor_tags t
		join vendor_profiles v on v.user_id = t.vendor_id
		where t.inspiration_id = any($1::uuid[]) and v.status = 'approved'
		order by v.category, v.business_name
	`, itemIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var itemID string
		var tag InspirationVendorTag
		if err := rows.Scan(&itemID, &tag.VendorID, &tag.BusinessName, &tag.Category, &tag.City); err != nil {
			return nil, err
		}
		out[itemID] = append(out[itemID], tag)
	}
	return out, rows.Err()
}

// ErrVendorNotApproved means one of the IDs passed to SetVendorTags is not
// an approved vendor, so nothing was changed.
var ErrVendorNotApproved = errors.New("vendor not approved")

// SetVendorTags replaces the vendors tagged on one item with vendorIDs, in a
// single transaction. Every ID must be an approved vendor; otherwise it
// returns ErrVendorNotApproved and leaves the existing tags untouched.
func (r *InspirationRepo) SetVendorTags(ctx context.Context, itemID string, vendorIDs []string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after Commit

	if len(vendorIDs) > 0 {
		var approved int
		if err := tx.QueryRow(ctx, `
			select count(*) from vendor_profiles where user_id = any($1::uuid[]) and status = 'approved'
		`, vendorIDs).Scan(&approved); err != nil {
			return err
		}
		if approved != len(vendorIDs) {
			return ErrVendorNotApproved
		}
	}

	if _, err := tx.Exec(ctx, `delete from inspiration_vendor_tags where inspiration_id = $1`, itemID); err != nil {
		return err
	}
	if len(vendorIDs) > 0 {
		if _, err := tx.Exec(ctx, `
			insert into inspiration_vendor_tags (inspiration_id, vendor_id)
			select $1, unnest($2::uuid[])
		`, itemID, vendorIDs); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func scanInspirationItem(row pgx.Row) (*InspirationItem, error) {
	var it InspirationItem
	if err := row.Scan(&it.ID, &it.Category, &it.StoragePath, &it.PublicURL, &it.AltText, &it.Caption, &it.SourceCredit, &it.ExternalRef, &it.CreatedAt); err != nil {
		return nil, err
	}
	return &it, nil
}
