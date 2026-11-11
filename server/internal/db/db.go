package db

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Options tunes the pool for where the API runs. The zero value keeps pgx's
// defaults (what the long-running `go run ./cmd/api` server has always used).
type Options struct {
	// MaxConns caps open connections per process; 0 keeps the pgx default.
	MaxConns int32
	// MaxConnIdleTime closes connections idle for longer than this; 0 keeps
	// the pgx default. Serverless instances use a short value so a paused
	// instance does not hold pooler slots for long.
	MaxConnIdleTime time.Duration
}

// New creates a connection pool against the Supabase Postgres pooler.
func New(ctx context.Context, poolerURL string) (*pgxpool.Pool, error) {
	return NewWithOptions(ctx, poolerURL, Options{})
}

// NewWithOptions is New with pool tuning (see Options).
func NewWithOptions(ctx context.Context, poolerURL string, opts Options) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(poolerURL)
	if err != nil {
		// pgx parse errors can echo the DSN; never wrap them verbatim.
		return nil, fmt.Errorf("parse database pooler url: invalid connection string")
	}

	cfg.MaxConnLifetime = 30 * time.Minute
	if opts.MaxConns > 0 {
		cfg.MaxConns = opts.MaxConns
	}
	if opts.MaxConnIdleTime > 0 {
		cfg.MaxConnIdleTime = opts.MaxConnIdleTime
	}

	// Supabase's transaction-mode pooler (port 6543) hands each transaction
	// to any backend, so pgx's default named, server-side prepared
	// statements break there. CacheDescribe uses unnamed statements only
	// while keeping the server's parameter type inference. The simple
	// protocol and exec modes are NOT safe for this codebase: they change
	// how `$1 = '' or col = $1::enum` and []byte-to-jsonb arguments behave.
	// A DSN that sets default_query_exec_mode itself wins.
	if IsTransactionPooler(poolerURL) && !strings.Contains(poolerURL, "default_query_exec_mode") {
		cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeCacheDescribe
	}

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

// IsTransactionPooler reports whether the DSN points at Supabase's
// transaction-mode pooler (port 6543).
func IsTransactionPooler(dsn string) bool {
	u, err := url.Parse(dsn)
	if err != nil {
		return false
	}
	return u.Port() == "6543"
}
