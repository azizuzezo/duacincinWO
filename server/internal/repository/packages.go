package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VendorPackage struct {
	ID          string
	VendorID    string
	Name        string
	Description string
	Price       int64
	SortOrder   int
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type PackageRepo struct {
	pool *pgxpool.Pool
}

// Packages returns the package repository sharing this repo's connection
// pool, so callers that already hold a VendorRepo need no extra wiring.
func (r *VendorRepo) Packages() *PackageRepo {
	return &PackageRepo{pool: r.pool}
}

const packageColumns = `id, vendor_id, name, description, price, sort_order, created_at, updated_at`

func scanPackage(row pgx.Row) (*VendorPackage, error) {
	var p VendorPackage
	if err := row.Scan(&p.ID, &p.VendorID, &p.Name, &p.Description, &p.Price, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *PackageRepo) ListForVendor(ctx context.Context, vendorID string) ([]VendorPackage, error) {
	rows, err := r.pool.Query(ctx, `
		select `+packageColumns+`
		from vendor_packages where vendor_id = $1
		order by sort_order, created_at
	`, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []VendorPackage{}
	for rows.Next() {
		var p VendorPackage
		if err := rows.Scan(&p.ID, &p.VendorID, &p.Name, &p.Description, &p.Price, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *PackageRepo) Count(ctx context.Context, vendorID string) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `select count(*) from vendor_packages where vendor_id = $1`, vendorID).Scan(&n)
	return n, err
}

// Create appends a package after the vendor's existing ones.
func (r *PackageRepo) Create(ctx context.Context, vendorID, name, description string, price int64) (*VendorPackage, error) {
	return scanPackage(r.pool.QueryRow(ctx, `
		insert into vendor_packages (vendor_id, name, description, price, sort_order)
		values ($1, $2, $3, $4, coalesce((select max(sort_order) + 1 from vendor_packages where vendor_id = $1), 0))
		returning `+packageColumns, vendorID, name, description, price))
}

// Update is scoped to vendorID (IDOR-safe): a package id belonging to another
// vendor behaves exactly like a missing one and yields ErrNotFound.
func (r *PackageRepo) Update(ctx context.Context, id, vendorID, name, description string, price int64) (*VendorPackage, error) {
	return scanPackage(r.pool.QueryRow(ctx, `
		update vendor_packages
		set name = $3, description = $4, price = $5, updated_at = now()
		where id = $1 and vendor_id = $2
		returning `+packageColumns, id, vendorID, name, description, price))
}

func (r *PackageRepo) Delete(ctx context.Context, id, vendorID string) error {
	tag, err := r.pool.Exec(ctx, `delete from vendor_packages where id = $1 and vendor_id = $2`, id, vendorID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
