package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")
var ErrDuplicateEmail = errors.New("email already registered")

const maxFailedLoginAttempts = 5
const loginLockMinutes = 15

const (
	AccountStatusActive     = "active"
	AccountStatusSuspended  = "suspended"
	AccountStatusTerminated = "terminated"
)

type User struct {
	ID                  string
	Email               string
	PasswordHash        string
	Role                string
	FullName            string
	FailedLoginAttempts int
	LockedUntil         *time.Time
	AccountStatus       string
	SuspendedUntil      *time.Time
	CreatedAt           time.Time
}

func (u *User) IsLocked() bool {
	return u.LockedUntil != nil && u.LockedUntil.After(time.Now())
}

// IsBlocked reports whether a sanction (PRD §8.6) currently prevents login —
// terminated permanently, or suspended within its active window.
func (u *User) IsBlocked() bool {
	if u.AccountStatus == AccountStatusTerminated {
		return true
	}
	return u.AccountStatus == AccountStatusSuspended && (u.SuspendedUntil == nil || u.SuspendedUntil.After(time.Now()))
}

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

func (r *UserRepo) Create(ctx context.Context, email, passwordHash, role, fullName string) (*User, error) {
	row := r.pool.QueryRow(ctx, `
		insert into users (email, password_hash, role, full_name)
		values (lower($1), $2, $3, $4)
		returning id, email, password_hash, role, full_name, failed_login_attempts, locked_until, account_status, suspended_until, created_at
	`, email, passwordHash, role, fullName)

	u, err := scanUser(row)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrDuplicateEmail
		}
		return nil, err
	}
	return u, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*User, error) {
	row := r.pool.QueryRow(ctx, `
		select id, email, password_hash, role, full_name, failed_login_attempts, locked_until, account_status, suspended_until, created_at
		from users where email = lower($1)
	`, email)

	u, err := scanUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (*User, error) {
	row := r.pool.QueryRow(ctx, `
		select id, email, password_hash, role, full_name, failed_login_attempts, locked_until, account_status, suspended_until, created_at
		from users where id = $1
	`, id)

	u, err := scanUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

// RegisterFailedLogin increments the failure counter and locks the
// account once it reaches maxFailedLoginAttempts (PRD §8.2). Returns
// whether the account is locked after this attempt.
func (r *UserRepo) RegisterFailedLogin(ctx context.Context, id string) (bool, error) {
	row := r.pool.QueryRow(ctx, `
		update users
		set failed_login_attempts = failed_login_attempts + 1,
		    locked_until = case
		        when failed_login_attempts + 1 >= $2 then now() + make_interval(mins => $3)
		        else locked_until
		    end,
		    updated_at = now()
		where id = $1
		returning locked_until
	`, id, maxFailedLoginAttempts, loginLockMinutes)

	var lockedUntil *time.Time
	if err := row.Scan(&lockedUntil); err != nil {
		return false, err
	}
	return lockedUntil != nil && lockedUntil.After(time.Now()), nil
}

func (r *UserRepo) ResetFailedLogin(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `
		update users set failed_login_attempts = 0, locked_until = null, updated_at = now()
		where id = $1
	`, id)
	return err
}

func (r *UserRepo) UpdatePassword(ctx context.Context, id, passwordHash string) error {
	_, err := r.pool.Exec(ctx, `
		update users
		set password_hash = $2, failed_login_attempts = 0, locked_until = null, updated_at = now()
		where id = $1
	`, id, passwordHash)
	return err
}

func scanUser(row pgx.Row) (*User, error) {
	var u User
	if err := row.Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.FullName,
		&u.FailedLoginAttempts, &u.LockedUntil, &u.AccountStatus, &u.SuspendedUntil, &u.CreatedAt,
	); err != nil {
		return nil, err
	}
	return &u, nil
}

// SetAccountStatus applies a sanction (PRD §8.6): "suspended" with
// suspendedUntil set, or "terminated" (permanent, suspendedUntil ignored),
// or "active" to lift a sanction.
func (r *UserRepo) SetAccountStatus(ctx context.Context, id, status string, suspendedUntil *time.Time) error {
	_, err := r.pool.Exec(ctx, `
		update users set account_status = $2, suspended_until = $3, updated_at = now()
		where id = $1
	`, id, status, suspendedUntil)
	return err
}

func isUniqueViolation(err error) bool {
	var pgErr interface{ SQLState() string }
	if errors.As(err, &pgErr) {
		return pgErr.SQLState() == "23505"
	}
	return false
}
