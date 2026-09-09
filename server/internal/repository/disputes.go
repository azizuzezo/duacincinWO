package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	DisputeStatusOpen     = "open"
	DisputeStatusResolved = "resolved"
)

type Dispute struct {
	ID              string
	VendorID        string
	MessageID       *string
	Reason          string
	Status          string
	SanctionApplied *string
	CreatedAt       time.Time
	ResolvedAt      *time.Time
}

type DisputeRepo struct {
	pool *pgxpool.Pool
}

func NewDisputeRepo(pool *pgxpool.Pool) *DisputeRepo {
	return &DisputeRepo{pool: pool}
}

// Create opens a dispute — called automatically when a chat message gets
// flagged for likely off-platform contact (PRD §8.4/§8.6).
func (r *DisputeRepo) Create(ctx context.Context, vendorID string, messageID *string, reason string) error {
	_, err := r.pool.Exec(ctx, `
		insert into disputes (vendor_id, message_id, reason)
		values ($1, $2, $3)
	`, vendorID, messageID, reason)
	return err
}

func (r *DisputeRepo) ListOpen(ctx context.Context) ([]Dispute, error) {
	rows, err := r.pool.Query(ctx, `
		select id, vendor_id, message_id, reason, status, sanction_applied, created_at, resolved_at
		from disputes where status = $1 order by created_at asc
	`, DisputeStatusOpen)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Dispute
	for rows.Next() {
		var d Dispute
		if err := rows.Scan(&d.ID, &d.VendorID, &d.MessageID, &d.Reason, &d.Status, &d.SanctionApplied, &d.CreatedAt, &d.ResolvedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *DisputeRepo) GetByID(ctx context.Context, id string) (*Dispute, error) {
	row := r.pool.QueryRow(ctx, `
		select id, vendor_id, message_id, reason, status, sanction_applied, created_at, resolved_at
		from disputes where id = $1
	`, id)
	var d Dispute
	if err := row.Scan(&d.ID, &d.VendorID, &d.MessageID, &d.Reason, &d.Status, &d.SanctionApplied, &d.CreatedAt, &d.ResolvedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &d, nil
}

// Resolve closes a dispute with the sanction Admin decided to apply
// ("warning", "suspend", "terminate", or "none").
func (r *DisputeRepo) Resolve(ctx context.Context, id, sanction string) error {
	_, err := r.pool.Exec(ctx, `
		update disputes set status = $2, sanction_applied = $3, resolved_at = now()
		where id = $1
	`, id, DisputeStatusResolved, sanction)
	return err
}

// CountOpen powers the Admin dashboard's "laporan pelanggaran terbuka" stat.
func (r *DisputeRepo) CountOpen(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `select count(*) from disputes where status = $1`, DisputeStatusOpen).Scan(&count)
	return count, err
}
