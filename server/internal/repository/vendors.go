package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VendorProfile struct {
	UserID       string
	BusinessName string
	// Category is the vendor's main category, always Categories[0].
	Category string
	// Categories are every kind of service the vendor offers.
	Categories      []string
	City            string
	PriceMin        int64
	PriceMax        int64
	Description     string
	Status          string
	RejectionReason *string
	CommissionRate  *float64
	// Cities are the kabupaten/kota the vendor serves, from internal/wilayah;
	// City is their joined display form. Empty for free-text profiles that
	// could not be split.
	Cities    []string
	CreatedAt time.Time
	UpdatedAt time.Time
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
// categories must be non-empty; its first entry becomes the main category.
func (r *VendorRepo) UpsertProfile(ctx context.Context, userID, businessName string, categories, cities []string, priceMin, priceMax int64, description string) (*VendorProfile, error) {
	row := r.pool.QueryRow(ctx, `
		insert into vendor_profiles (user_id, business_name, category, categories, cities, city, price_min, price_max, description)
		values ($1, $2, ($3::text[])[1]::vendor_category, $3::text[]::vendor_category[], $4, array_to_string($4::text[], ', '), $5, $6, $7)
		on conflict (user_id) do update set
			category = excluded.category,
			categories = excluded.categories,
			cities = excluded.cities,
			city = excluded.city,
			price_min = excluded.price_min,
			price_max = excluded.price_max,
			description = excluded.description,
			updated_at = now()
		returning user_id, business_name, category, city, price_min, price_max, description, status, rejection_reason, commission_rate, created_at, updated_at, cities, categories::text[]
	`, userID, businessName, categories, cities, priceMin, priceMax, description)

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
		select user_id, business_name, category, city, price_min, price_max, description, status, rejection_reason, commission_rate, created_at, updated_at, cities, categories::text[]
		from vendor_profiles where user_id = $1
	`, userID)
	p, err := scanVendorProfile(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return p, err
}

// ListApproved returns approved vendors, optionally filtered by
// category/city/maxPrice (maxPrice=0 means no price filter). category
// matches any of the vendor's categories. maxPrice is a
// couple's budget, so it is compared with the starting price they would pay
// (vendor price plus commission). city matches any of the vendor's cities,
// or the free-text city of a profile that has none.
func (r *VendorRepo) ListApproved(ctx context.Context, category, city string, maxPrice int64) ([]VendorProfile, error) {
	rows, err := r.pool.Query(ctx, `
		select user_id, business_name, category, city, price_min, price_max, description, status, rejection_reason, commission_rate, created_at, updated_at, cities, categories::text[]
		from vendor_profiles
		where status = 'approved'
		  and ($1 = '' or $1::vendor_category = any(categories))
		  and ($2 = '' or exists (select 1 from unnest(cities) c where lower(c) = lower($2)) or (cardinality(cities) = 0 and city ilike $2))
		  and ($3 = 0 or round(price_min * (1 + coalesce(commission_rate, $4))) <= $3)
		order by created_at desc
	`, category, city, maxPrice, DefaultCommissionRate)
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
		select user_id, business_name, category, city, price_min, price_max, description, status, rejection_reason, commission_rate, created_at, updated_at, cities, categories::text[]
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
		&p.Description, &p.Status, &p.RejectionReason, &p.CommissionRate, &p.CreatedAt, &p.UpdatedAt, &p.Cities, &p.Categories,
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
			&p.Description, &p.Status, &p.RejectionReason, &p.CommissionRate, &p.CreatedAt, &p.UpdatedAt, &p.Cities, &p.Categories,
		); err != nil {
			return nil, err
		}
		profiles = append(profiles, p)
	}
	return profiles, rows.Err()
}

// ErrVendorHasBookings blocks deleting a vendor whose bookings (and the
// payments and disbursements hanging off them) must stay on record.
var ErrVendorHasBookings = errors.New("vendor has bookings")

// DeletedVendor is what DeleteAccount removed, for the audit trail and for
// cleaning up the vendor's files in Storage afterwards.
type DeletedVendor struct {
	BusinessName     string
	PortfolioPaths   []string
	BookingsBlocking int
}

// DeleteAccount permanently removes a vendor's user account; the profile,
// portfolio, packages, chats and disputes go with it through on delete
// cascade. It refuses with ErrVendorHasBookings while any booking exists,
// because deleting the user would cascade away clients' booking, payment and
// disbursement records. The user row is locked first, so a booking created
// concurrently either lands before the count (and blocks the delete) or
// fails its foreign key after it.
func (r *VendorRepo) DeleteAccount(ctx context.Context, userID string) (*DeletedVendor, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	out := &DeletedVendor{}
	err = tx.QueryRow(ctx, `
		select vp.business_name
		from users u join vendor_profiles vp on vp.user_id = u.id
		where u.id = $1 and u.role = 'vendor'
		for update of u
	`, userID).Scan(&out.BusinessName)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if err := tx.QueryRow(ctx, `select count(*) from bookings where vendor_id = $1`, userID).Scan(&out.BookingsBlocking); err != nil {
		return nil, err
	}
	if out.BookingsBlocking > 0 {
		return out, ErrVendorHasBookings
	}

	rows, err := tx.Query(ctx, `select storage_path from vendor_portfolio_items where vendor_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	paths, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, err
	}
	out.PortfolioPaths = paths

	if _, err := tx.Exec(ctx, `delete from users where id = $1 and role = 'vendor'`, userID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return out, nil
}

// FreeTextCities lists profiles that still have only a free-text city, for
// the startup backfill that splits them into list entries.
func (r *VendorRepo) FreeTextCities(ctx context.Context) (map[string]string, error) {
	rows, err := r.pool.Query(ctx, `select user_id, city from vendor_profiles where cardinality(cities) = 0 and city <> ''`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var id, city string
		if err := rows.Scan(&id, &city); err != nil {
			return nil, err
		}
		out[id] = city
	}
	return out, rows.Err()
}

// SetCities stores a profile's cities and their joined display form.
func (r *VendorRepo) SetCities(ctx context.Context, userID string, cities []string) error {
	_, err := r.pool.Exec(ctx, `
		update vendor_profiles set cities = $2, city = array_to_string($2::text[], ', '), updated_at = now()
		where user_id = $1
	`, userID, cities)
	return err
}
