// Package ratelimit implements a DB-backed fixed-window limiter against
// the rate_limit_events table (PRD §8.2 / §9), so limits survive process
// restarts and are auditable.
package ratelimit

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Limiter struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Limiter {
	return &Limiter{pool: pool}
}

// Allow records one attempt for (key, action) and reports whether the
// caller is still within limit over the trailing window. It always
// records the attempt, including ones that end up denied, so repeated
// abuse keeps tripping the limit rather than resetting it.
func (l *Limiter) Allow(ctx context.Context, key, action string, limit int, window time.Duration) (bool, error) {
	var count int
	err := l.pool.QueryRow(ctx, `
		select count(*) from rate_limit_events
		where key = $1 and action = $2 and created_at > now() - make_interval(secs => $3)
	`, key, action, window.Seconds()).Scan(&count)
	if err != nil {
		return false, err
	}

	if count >= limit {
		return false, nil
	}

	if _, err := l.pool.Exec(ctx, `
		insert into rate_limit_events (key, action) values ($1, $2)
	`, key, action); err != nil {
		return false, err
	}

	return true, nil
}
