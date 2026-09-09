package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const PurposePasswordReset = "password_reset"

type OTPCode struct {
	ID        string
	UserID    string
	Purpose   string
	CodeHash  string
	ExpiresAt time.Time
	Consumed  bool
}

type OTPRepo struct {
	pool *pgxpool.Pool
}

func NewOTPRepo(pool *pgxpool.Pool) *OTPRepo {
	return &OTPRepo{pool: pool}
}

func (r *OTPRepo) Create(ctx context.Context, userID, purpose, codeHash string, ttl time.Duration) error {
	_, err := r.pool.Exec(ctx, `
		insert into otp_codes (user_id, purpose, code_hash, expires_at)
		values ($1, $2, $3, now() + make_interval(secs => $4))
	`, userID, purpose, codeHash, ttl.Seconds())
	return err
}

// GetLatestValid returns the most recent, unconsumed, unexpired OTP for
// (userID, purpose), or ErrNotFound.
func (r *OTPRepo) GetLatestValid(ctx context.Context, userID, purpose string) (*OTPCode, error) {
	row := r.pool.QueryRow(ctx, `
		select id, user_id, purpose, code_hash, expires_at, (consumed_at is not null)
		from otp_codes
		where user_id = $1 and purpose = $2 and consumed_at is null and expires_at > now()
		order by created_at desc
		limit 1
	`, userID, purpose)

	var o OTPCode
	if err := row.Scan(&o.ID, &o.UserID, &o.Purpose, &o.CodeHash, &o.ExpiresAt, &o.Consumed); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &o, nil
}

func (r *OTPRepo) MarkConsumed(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `update otp_codes set consumed_at = now() where id = $1`, id)
	return err
}
