package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// New creates a connection pool against the Supabase Postgres pooler.
func New(ctx context.Context, poolerURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(poolerURL)
	if err != nil {
		return nil, fmt.Errorf("parse database pooler url: %w", err)
	}

	cfg.MaxConnLifetime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return pool, nil
}
