package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SeatingTable struct {
	ID        string
	ClientID  string
	Name      string
	Capacity  int
	SortOrder int
	CreatedAt time.Time
}

type SeatingTableRepo struct {
	pool *pgxpool.Pool
}

func NewSeatingTableRepo(pool *pgxpool.Pool) *SeatingTableRepo {
	return &SeatingTableRepo{pool: pool}
}

func (r *SeatingTableRepo) Create(ctx context.Context, clientID, name string, capacity int) (*SeatingTable, error) {
	var nextOrder int
	if err := r.pool.QueryRow(ctx, `select coalesce(max(sort_order), -1) + 1 from wedding_seating_tables where client_id = $1`, clientID).Scan(&nextOrder); err != nil {
		return nil, err
	}

	row := r.pool.QueryRow(ctx, `
		insert into wedding_seating_tables (client_id, name, capacity, sort_order)
		values ($1, $2, $3, $4)
		returning id, client_id, name, capacity, sort_order, created_at
	`, clientID, name, capacity, nextOrder)
	return scanSeatingTable(row)
}

func (r *SeatingTableRepo) ListForClient(ctx context.Context, clientID string) ([]SeatingTable, error) {
	rows, err := r.pool.Query(ctx, `
		select id, client_id, name, capacity, sort_order, created_at
		from wedding_seating_tables where client_id = $1 order by sort_order
	`, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []SeatingTable
	for rows.Next() {
		var t SeatingTable
		if err := rows.Scan(&t.ID, &t.ClientID, &t.Name, &t.Capacity, &t.SortOrder, &t.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (r *SeatingTableRepo) GetByID(ctx context.Context, id string) (*SeatingTable, error) {
	row := r.pool.QueryRow(ctx, `
		select id, client_id, name, capacity, sort_order, created_at
		from wedding_seating_tables where id = $1
	`, id)
	t, err := scanSeatingTable(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

func (r *SeatingTableRepo) Update(ctx context.Context, clientID, id, name string, capacity int) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		update wedding_seating_tables set name = $3, capacity = $4 where id = $2 and client_id = $1
	`, clientID, id, name, capacity)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *SeatingTableRepo) Delete(ctx context.Context, clientID, id string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `delete from wedding_seating_tables where id = $2 and client_id = $1`, clientID, id)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func scanSeatingTable(row pgx.Row) (*SeatingTable, error) {
	var t SeatingTable
	if err := row.Scan(&t.ID, &t.ClientID, &t.Name, &t.Capacity, &t.SortOrder, &t.CreatedAt); err != nil {
		return nil, err
	}
	return &t, nil
}

// --- Seating assignments (which guest sits at which table) ---

type SeatingAssignment struct {
	ID      string
	TableID string
	GuestID string
}

type SeatingAssignmentRepo struct {
	pool *pgxpool.Pool
}

func NewSeatingAssignmentRepo(pool *pgxpool.Pool) *SeatingAssignmentRepo {
	return &SeatingAssignmentRepo{pool: pool}
}

// Assign seats guestID at tableID, moving them from any previous table
// (guest_id is unique, so one seat per guest).
func (r *SeatingAssignmentRepo) Assign(ctx context.Context, tableID, guestID string) error {
	_, err := r.pool.Exec(ctx, `
		insert into wedding_seating_assignments (table_id, guest_id)
		values ($1, $2)
		on conflict (guest_id) do update set table_id = excluded.table_id
	`, tableID, guestID)
	return err
}

func (r *SeatingAssignmentRepo) Unassign(ctx context.Context, guestID string) error {
	_, err := r.pool.Exec(ctx, `delete from wedding_seating_assignments where guest_id = $1`, guestID)
	return err
}

// ListForClient returns every assignment across all of clientID's tables
// (joins through wedding_seating_tables since assignments carry no
// client_id of their own).
func (r *SeatingAssignmentRepo) ListForClient(ctx context.Context, clientID string) ([]SeatingAssignment, error) {
	rows, err := r.pool.Query(ctx, `
		select a.id, a.table_id, a.guest_id
		from wedding_seating_assignments a
		join wedding_seating_tables t on t.id = a.table_id
		where t.client_id = $1
	`, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []SeatingAssignment
	for rows.Next() {
		var a SeatingAssignment
		if err := rows.Scan(&a.ID, &a.TableID, &a.GuestID); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}
