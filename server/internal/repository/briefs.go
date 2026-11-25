package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"duacincin/server/internal/briefs"
)

// BriefRepo records the briefs couples send to vendors (migration 000033).
type BriefRepo struct {
	pool *pgxpool.Pool
}

func NewBriefRepo(pool *pgxpool.Pool) *BriefRepo { return &BriefRepo{pool: pool} }

func (r *BriefRepo) Create(ctx context.Context, clientID string, b briefs.Brief) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, `
		insert into wedding_briefs (client_id, category, city, event_date, guests, style, budget_max, notes)
		values ($1, $2, $3, $4, nullif($5, 0), $6, nullif($7::bigint, 0), $8)
		returning id
	`, clientID, b.Category, b.City, b.EventDate, b.Guests, b.Style, b.BudgetMax, b.Notes).Scan(&id)
	return id, err
}

func (r *BriefRepo) AddRecipient(ctx context.Context, briefID, vendorID, conversationID string) error {
	_, err := r.pool.Exec(ctx, `
		insert into wedding_brief_recipients (brief_id, vendor_id, conversation_id)
		values ($1, $2, $3) on conflict do nothing
	`, briefID, vendorID, conversationID)
	return err
}

// CountSince is how many briefs the client created since t.
func (r *BriefRepo) CountSince(ctx context.Context, clientID string, t time.Time) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `select count(*) from wedding_briefs where client_id = $1 and created_at >= $2`, clientID, t).Scan(&n)
	return n, err
}

// SentSince reports whether this client already sent this vendor a brief for
// the category since t (so the same request is not repeated).
func (r *BriefRepo) SentSince(ctx context.Context, clientID, vendorID, category string, t time.Time) (bool, error) {
	var ok bool
	err := r.pool.QueryRow(ctx, `
		select exists (
			select 1 from wedding_briefs b
			join wedding_brief_recipients rc on rc.brief_id = b.id
			where b.client_id = $1 and rc.vendor_id = $2 and b.category = $3 and b.created_at >= $4
		)
	`, clientID, vendorID, category, t).Scan(&ok)
	return ok, err
}
