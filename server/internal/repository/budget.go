package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BudgetCategory struct {
	Category   string
	Percentage float64
}

type BudgetPlan struct {
	ClientID    string
	TotalBudget int64
	GuestCount  int
	Categories  []BudgetCategory
	UpdatedAt   time.Time
}

type BudgetRepo struct {
	pool *pgxpool.Pool
}

func NewBudgetRepo(pool *pgxpool.Pool) *BudgetRepo {
	return &BudgetRepo{pool: pool}
}

// Upsert replaces the client's whole budget plan (plan + categories) in one
// transaction. Categories are always written in full — the frontend always
// sends the complete, already-rescaled set (PRD §8.8).
func (r *BudgetRepo) Upsert(ctx context.Context, clientID string, totalBudget int64, guestCount int, categories []BudgetCategory) (*BudgetPlan, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		insert into budget_plans (client_id, total_budget, guest_count)
		values ($1, $2, $3)
		on conflict (client_id) do update set
			total_budget = excluded.total_budget,
			guest_count = excluded.guest_count,
			updated_at = now()
	`, clientID, totalBudget, guestCount); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, `delete from budget_plan_categories where plan_client_id = $1`, clientID); err != nil {
		return nil, err
	}

	for _, c := range categories {
		if _, err := tx.Exec(ctx, `
			insert into budget_plan_categories (plan_client_id, category, percentage)
			values ($1, $2, $3)
		`, clientID, c.Category, c.Percentage); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.GetByClientID(ctx, clientID)
}

func (r *BudgetRepo) GetByClientID(ctx context.Context, clientID string) (*BudgetPlan, error) {
	row := r.pool.QueryRow(ctx, `
		select client_id, total_budget, guest_count, updated_at from budget_plans where client_id = $1
	`, clientID)

	var p BudgetPlan
	if err := row.Scan(&p.ClientID, &p.TotalBudget, &p.GuestCount, &p.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	rows, err := r.pool.Query(ctx, `
		select category, percentage from budget_plan_categories where plan_client_id = $1 order by category
	`, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var c BudgetCategory
		if err := rows.Scan(&c.Category, &c.Percentage); err != nil {
			return nil, err
		}
		p.Categories = append(p.Categories, c)
	}

	return &p, rows.Err()
}
