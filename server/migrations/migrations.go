// Package migrations embeds the SQL migration files and applies them
// against the Supabase Postgres database on server startup.
package migrations

import (
	"embed"
	"errors"
	"fmt"
	"net/url"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed *.sql
var files embed.FS

// Run applies all pending migrations against databaseURL (the same
// Postgres connection string used by the rest of the app). It is safe
// to call on every startup — a no-op when the schema is already current.
func Run(databaseURL string) error {
	source, err := iofs.New(files, ".")
	if err != nil {
		return fmt.Errorf("load embedded migrations: %w", err)
	}

	migrationDSN, err := toPgx5URL(databaseURL)
	if err != nil {
		return fmt.Errorf("build migration dsn: %w", err)
	}

	m, err := migrate.NewWithSourceInstance("iofs", source, migrationDSN)
	if err != nil {
		return fmt.Errorf("init migrator: %w", err)
	}

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("apply migrations: %w", err)
	}

	return nil
}

// toPgx5URL rewrites a postgres:// / postgresql:// DSN to the pgx5://
// scheme required by the golang-migrate pgx/v5 database driver.
func toPgx5URL(databaseURL string) (string, error) {
	u, err := url.Parse(databaseURL)
	if err != nil {
		return "", err
	}
	u.Scheme = "pgx5"
	return u.String(), nil
}
