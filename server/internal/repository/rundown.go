package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RundownItem struct {
	ID        string
	ClientID  string
	StartTime string // "HH:MM", 24h
	Title     string
	Notes     string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type RundownRepo struct {
	pool *pgxpool.Pool
}

func NewRundownRepo(pool *pgxpool.Pool) *RundownRepo {
	return &RundownRepo{pool: pool}
}

func (r *RundownRepo) Create(ctx context.Context, clientID, startTime, title, notes string) (*RundownItem, error) {
	row := r.pool.QueryRow(ctx, `
		insert into wedding_rundown_items (client_id, start_time, title, notes)
		values ($1, $2, $3, $4)
		returning id, client_id, start_time, title, notes, created_at, updated_at
	`, clientID, startTime, title, notes)
	return scanRundownItem(row)
}

func (r *RundownRepo) ListForClient(ctx context.Context, clientID string) ([]RundownItem, error) {
	rows, err := r.pool.Query(ctx, `
		select id, client_id, start_time, title, notes, created_at, updated_at
		from wedding_rundown_items where client_id = $1 order by start_time asc
	`, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []RundownItem
	for rows.Next() {
		var it RundownItem
		if err := rows.Scan(&it.ID, &it.ClientID, &it.StartTime, &it.Title, &it.Notes, &it.CreatedAt, &it.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (r *RundownRepo) Update(ctx context.Context, clientID, id, startTime, title, notes string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		update wedding_rundown_items set start_time = $3, title = $4, notes = $5, updated_at = now()
		where id = $2 and client_id = $1
	`, clientID, id, startTime, title, notes)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *RundownRepo) Delete(ctx context.Context, clientID, id string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `delete from wedding_rundown_items where id = $2 and client_id = $1`, clientID, id)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func scanRundownItem(row pgx.Row) (*RundownItem, error) {
	var it RundownItem
	if err := row.Scan(&it.ID, &it.ClientID, &it.StartTime, &it.Title, &it.Notes, &it.CreatedAt, &it.UpdatedAt); err != nil {
		return nil, err
	}
	return &it, nil
}
