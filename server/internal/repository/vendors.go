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
	CommissionRate  *float64
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

// UpsertProfile creates a vendor's profile on first save (business_name is
// only ever set here, on creation) or updates the editable fields on
// subsequent saves. Unlike before, an edit no longer resets status to
// pending — only the vendor's initial Admin approval and business_name
// changes (see vendor_name_change_requests) go through review now.
func (r *VendorRepo) UpsertProfile(ctx context.Context, userID, businessName, category, city string, priceMin, priceMax int64, description string) (*VendorProfile, error) {
	row := r.pool.QueryRow(ctx, `
		insert into vendor_profiles (user_id, business_name, category, city, price_min, price_max, description)
		values ($1, $2, $3, $4, $5, $6, $7)
		on conflict (user_id) do update set
			category = excluded.category,
			city = excluded.city,
			price_min = excluded.price_min,
			price_max = excluded.price_max,
			description = excluded.description,
			updated_at = now()
		returning user_id, business_name, category, city, price_min, price_max, description, status, rejection_reason, commission_rate, created_at, updated_at
	`, userID, businessName, category, city, priceMin, priceMax, description)

	return scanVendorProfile(row)
}

// UpdateBusinessName applies an approved name-change request. Deliberately
// separate from UpsertProfile so it never touches status/rejection_reason.
func (r *VendorRepo) UpdateBusinessName(ctx context.Context, userID, businessName string) error {
	_, err := r.pool.Exec(ctx, `
		update vendor_profiles set business_name = $2, updated_at = now() where user_id = $1
	`, userID, businessName)
	return err
}

func (r *VendorRepo) GetByUserID(ctx context.Context, userID string) (*VendorProfile, error) {
	row := r.pool.QueryRow(ctx, `
		select user_id, business_name, category, city, price_min, price_max, description, status, rejection_reason, commission_rate, created_at, updated_at
		from vendor_profiles where user_id = $1
	`, userID)
	p, err := scanVendorProfile(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return p, err
}

// ListApproved returns approved vendors, optionally filtered by
// category/city/maxPrice (maxPrice=0 means no price filter).
func (r *VendorRepo) ListApproved(ctx context.Context, category, city string, maxPrice int64) ([]VendorProfile, error) {
	rows, err := r.pool.Query(ctx, `
		select user_id, business_name, category, city, price_min, price_max, description, status, rejection_reason, commission_rate, created_at, updated_at
		from vendor_profiles
		where status = 'approved'
		  and ($1 = '' or category = $1::vendor_category)
		  and ($2 = '' or city ilike $2)
		  and ($3 = 0 or price_min <= $3)
		order by created_at desc
	`, category, city, maxPrice)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectVendorProfiles(rows)
}

// CountApproved powers the Admin dashboard's "jumlah vendor aktif" stat.
func (r *VendorRepo) CountApproved(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `select count(*) from vendor_profiles where status = 'approved'`).Scan(&count)
	return count, err
}

func (r *VendorRepo) ListPending(ctx context.Context) ([]VendorProfile, error) {
	rows, err := r.pool.Query(ctx, `
		select user_id, business_name, category, city, price_min, price_max, description, status, rejection_reason, commission_rate, created_at, updated_at
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

// SetCommissionRate overrides the platform default commission for one
// vendor (PRD §8.10 "Konfigurasi komisi per kategori/vendor"). Pass nil to
// clear the override and fall back to the default again.
func (r *VendorRepo) SetCommissionRate(ctx context.Context, userID string, rate *float64) error {
	_, err := r.pool.Exec(ctx, `
		update vendor_profiles set commission_rate = $2, updated_at = now()
		where user_id = $1
	`, userID, rate)
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

func (r *VendorRepo) CountPortfolio(ctx context.Context, vendorID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `select count(*) from vendor_portfolio_items where vendor_id = $1`, vendorID).Scan(&count)
	return count, err
}

// DeletePortfolioItem removes a portfolio item, scoped to its owning
// vendor (IDOR-safe — a vendor can only delete their own items). Returns
// the deleted row's storage_path so the caller can also remove the file
// from Storage; ErrNotFound if no matching row belonged to this vendor.
func (r *VendorRepo) DeletePortfolioItem(ctx context.Context, id, vendorID string) (string, error) {
	var storagePath string
	err := r.pool.QueryRow(ctx, `
		delete from vendor_portfolio_items where id = $1 and vendor_id = $2
		returning storage_path
	`, id, vendorID).Scan(&storagePath)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return storagePath, err
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
		&p.Description, &p.Status, &p.RejectionReason, &p.CommissionRate, &p.CreatedAt, &p.UpdatedAt,
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
			&p.Description, &p.Status, &p.RejectionReason, &p.CommissionRate, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		profiles = append(profiles, p)
	}
	return profiles, rows.Err()
}
