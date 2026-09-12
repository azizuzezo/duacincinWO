package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Review struct {
	ID        string
	BookingID string
	ClientID  string
	VendorID  string
	Rating    int
	Comment   *string
	CreatedAt time.Time
}

type ReviewRepo struct {
	pool *pgxpool.Pool
}

func NewReviewRepo(pool *pgxpool.Pool) *ReviewRepo {
	return &ReviewRepo{pool: pool}
}

// Create records a review for a booking. Callers are responsible for
// checking the booking is completed and belongs to clientID before calling
// this — the unique constraint on booking_id is the last line of defense
// against a duplicate submission (surfaced to callers as a pgconn unique
// violation, mapped to a 409 by the handler).
func (r *ReviewRepo) Create(ctx context.Context, bookingID, clientID, vendorID string, rating int, comment *string) (*Review, error) {
	row := r.pool.QueryRow(ctx, `
		insert into reviews (booking_id, client_id, vendor_id, rating, comment)
		values ($1, $2, $3, $4, $5)
		returning id, booking_id, client_id, vendor_id, rating, comment, created_at
	`, bookingID, clientID, vendorID, rating, comment)

	var rev Review
	if err := row.Scan(&rev.ID, &rev.BookingID, &rev.ClientID, &rev.VendorID, &rev.Rating, &rev.Comment, &rev.CreatedAt); err != nil {
		return nil, err
	}
	return &rev, nil
}

func (r *ReviewRepo) ListForVendor(ctx context.Context, vendorID string) ([]Review, error) {
	rows, err := r.pool.Query(ctx, `
		select id, booking_id, client_id, vendor_id, rating, comment, created_at
		from reviews where vendor_id = $1 order by created_at desc
	`, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Review
	for rows.Next() {
		var rev Review
		if err := rows.Scan(&rev.ID, &rev.BookingID, &rev.ClientID, &rev.VendorID, &rev.Rating, &rev.Comment, &rev.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, rev)
	}
	return out, rows.Err()
}

// GetAggregateForVendor returns the average rating and review count for a
// vendor. count is 0 (and avg 0) when the vendor has no reviews yet.
func (r *ReviewRepo) GetAggregateForVendor(ctx context.Context, vendorID string) (avg float64, count int, err error) {
	err = r.pool.QueryRow(ctx, `
		select coalesce(avg(rating), 0), count(*) from reviews where vendor_id = $1
	`, vendorID).Scan(&avg, &count)
	return avg, count, err
}
