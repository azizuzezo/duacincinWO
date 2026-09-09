package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VendorProfile struct {
	UserID          string
	BusinessName    string
	Category        string
	City            string
	PriceMin        int64
	PriceMax        int64
	Description     string
	Status          string
	RejectionReason *string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type PortfolioItem struct {
	ID        string
	VendorID  string
	PublicURL string
	AltText   string
	SortOrder int
	CreatedAt time.Time
}

type VendorRepo struct {
	pool *pgxpool.Pool
}

func NewVendorRepo(pool *pgxpool.Pool) *VendorRepo {
	return &VendorRepo{pool: pool}
}

// UpsertProfile creates or updates a vendor's own profile. Editing an
// already-approved profile resets it to pending — any change must be
// re-reviewed by an Admin (PRD §8.3).
func (r *VendorRepo) UpsertProfile(ctx context.Context, userID, businessName, category, city string, priceMin, priceMax int64, description string) (*VendorProfile, error) {
	row := r.pool.QueryRow(ctx, `
		insert into vendor_profiles (user_id, business_name, category, city, price_min, price_max, description)
		values ($1, $2, $3, $4, $5, $6, $7)
		on conflict (user_id) do update set
			business_name = excluded.business_name,
			category = excluded.category,
			city = excluded.city,
			price_min = excluded.price_min,
			price_max = excluded.price_max,
			description = excluded.description,
			status = 'pending',
			rejection_reason = null,
			updated_at = now()
		returning user_id, business_name, category, city, price_min, price_max, description, status, rejection_reason, created_at, updated_at
	`, userID, businessName, category, city, priceMin, priceMax, description)

	return scanVendorProfile(row)
}

func (r *VendorRepo) GetByUserID(ctx context.Context, userID string) (*VendorProfile, error) {
	row := r.pool.QueryRow(ctx, `
		select user_id, business_name, category, city, price_min, price_max, description, status, rejection_reason, created_at, updated_at
		from vendor_profiles where user_id = $1
	`, userID)
	p, err := scanVendorProfile(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return p, err
}

// ListApproved returns approved vendors, optionally filtered by category/city.
func (r *VendorRepo) ListApproved(ctx context.Context, category, city string) ([]VendorProfile, error) {
	rows, err := r.pool.Query(ctx, `
		select user_id, business_name, category, city, price_min, price_max, description, status, rejection_reason, created_at, updated_at
		from vendor_profiles
		where status = 'approved'
		  and ($1 = '' or category = $1::vendor_category)
		  and ($2 = '' or city ilike $2)
		order by created_at desc
	`, category, city)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectVendorProfiles(rows)
}

func (r *VendorRepo) ListPending(ctx context.Context) ([]VendorProfile, error) {
	rows, err := r.pool.Query(ctx, `
		select user_id, business_name, category, city, price_min, price_max, description, status, rejection_reason, created_at, updated_at
		from vendor_profiles where status = 'pending' order by created_at asc
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectVendorProfiles(rows)
}

func (r *VendorRepo) SetStatus(ctx context.Context, userID, status string, rejectionReason *string) error {
	_, err := r.pool.Exec(ctx, `
		update vendor_profiles set status = $2, rejection_reason = $3, updated_at = now()
		where user_id = $1
	`, userID, status, rejectionReason)
	return err
}

func (r *VendorRepo) AddPortfolioItem(ctx context.Context, vendorID, storagePath, publicURL, altText string) (*PortfolioItem, error) {
	row := r.pool.QueryRow(ctx, `
		insert into vendor_portfolio_items (vendor_id, storage_path, public_url, alt_text)
		values ($1, $2, $3, $4)
		returning id, vendor_id, public_url, alt_text, sort_order, created_at
	`, vendorID, storagePath, publicURL, altText)

	var item PortfolioItem
	if err := row.Scan(&item.ID, &item.VendorID, &item.PublicURL, &item.AltText, &item.SortOrder, &item.CreatedAt); err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *VendorRepo) ListPortfolio(ctx context.Context, vendorID string) ([]PortfolioItem, error) {
	rows, err := r.pool.Query(ctx, `
		select id, vendor_id, public_url, alt_text, sort_order, created_at
		from vendor_portfolio_items where vendor_id = $1 order by sort_order, created_at
	`, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []PortfolioItem
	for rows.Next() {
		var item PortfolioItem
		if err := rows.Scan(&item.ID, &item.VendorID, &item.PublicURL, &item.AltText, &item.SortOrder, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func scanVendorProfile(row pgx.Row) (*VendorProfile, error) {
	var p VendorProfile
	if err := row.Scan(
		&p.UserID, &p.BusinessName, &p.Category, &p.City, &p.PriceMin, &p.PriceMax,
		&p.Description, &p.Status, &p.RejectionReason, &p.CreatedAt, &p.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &p, nil
}

func collectVendorProfiles(rows pgx.Rows) ([]VendorProfile, error) {
	var profiles []VendorProfile
	for rows.Next() {
		var p VendorProfile
		if err := rows.Scan(
			&p.UserID, &p.BusinessName, &p.Category, &p.City, &p.PriceMin, &p.PriceMax,
			&p.Description, &p.Status, &p.RejectionReason, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		profiles = append(profiles, p)
	}
	return profiles, rows.Err()
}
