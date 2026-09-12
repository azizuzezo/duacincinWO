package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VendorNameChangeRequest struct {
	ID            string
	VendorID      string
	CurrentName   string
	RequestedName string
	Reason        string
	Status        string
	AdminNote     *string
	CreatedAt     time.Time
	ResolvedAt    *time.Time
}

type VendorNameChangeRepo struct {
	pool *pgxpool.Pool
}

func NewVendorNameChangeRepo(pool *pgxpool.Pool) *VendorNameChangeRepo {
	return &VendorNameChangeRepo{pool: pool}
}

func (r *VendorNameChangeRepo) Create(ctx context.Context, vendorID, currentName, requestedName, reason string) (*VendorNameChangeRequest, error) {
	row := r.pool.QueryRow(ctx, `
		insert into vendor_name_change_requests (vendor_id, current_name, requested_name, reason)
		values ($1, $2, $3, $4)
		returning id, vendor_id, current_name, requested_name, reason, status, admin_note, created_at, resolved_at
	`, vendorID, currentName, requestedName, reason)
	return scanVendorNameChangeRequest(row)
}

// GetPendingForVendor returns the vendor's currently pending request, if
// any (ErrNotFound otherwise) — enforces one pending request at a time.
func (r *VendorNameChangeRepo) GetPendingForVendor(ctx context.Context, vendorID string) (*VendorNameChangeRequest, error) {
	row := r.pool.QueryRow(ctx, `
		select id, vendor_id, current_name, requested_name, reason, status, admin_note, created_at, resolved_at
		from vendor_name_change_requests
		where vendor_id = $1 and status = 'pending'
	`, vendorID)
	req, err := scanVendorNameChangeRequest(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return req, err
}

func (r *VendorNameChangeRepo) ListPending(ctx context.Context) ([]VendorNameChangeRequest, error) {
	rows, err := r.pool.Query(ctx, `
		select id, vendor_id, current_name, requested_name, reason, status, admin_note, created_at, resolved_at
		from vendor_name_change_requests
		where status = 'pending'
		order by created_at asc
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []VendorNameChangeRequest
	for rows.Next() {
		var req VendorNameChangeRequest
		if err := rows.Scan(
			&req.ID, &req.VendorID, &req.CurrentName, &req.RequestedName, &req.Reason,
			&req.Status, &req.AdminNote, &req.CreatedAt, &req.ResolvedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, req)
	}
	return out, rows.Err()
}

func (r *VendorNameChangeRepo) GetByID(ctx context.Context, id string) (*VendorNameChangeRequest, error) {
	row := r.pool.QueryRow(ctx, `
		select id, vendor_id, current_name, requested_name, reason, status, admin_note, created_at, resolved_at
		from vendor_name_change_requests where id = $1
	`, id)
	req, err := scanVendorNameChangeRequest(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return req, err
}

// Resolve marks a pending request approved or rejected. Applying the new
// business_name to the vendor's profile (on approve) is the caller's
// responsibility — this only records the decision.
func (r *VendorNameChangeRepo) Resolve(ctx context.Context, id, status, adminNote string) (*VendorNameChangeRequest, error) {
	row := r.pool.QueryRow(ctx, `
		update vendor_name_change_requests
		set status = $2, admin_note = nullif($3, ''), resolved_at = now()
		where id = $1
		returning id, vendor_id, current_name, requested_name, reason, status, admin_note, created_at, resolved_at
	`, id, status, adminNote)
	return scanVendorNameChangeRequest(row)
}

func scanVendorNameChangeRequest(row pgx.Row) (*VendorNameChangeRequest, error) {
	var req VendorNameChangeRequest
	if err := row.Scan(
		&req.ID, &req.VendorID, &req.CurrentName, &req.RequestedName, &req.Reason,
		&req.Status, &req.AdminNote, &req.CreatedAt, &req.ResolvedAt,
	); err != nil {
		return nil, err
	}
	return &req, nil
}
