package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	TaskStatusTodo       = "todo"
	TaskStatusInProgress = "in_progress"
	TaskStatusDone       = "done"
)

type PlannerTask struct {
	ID              string
	ClientID        string
	Timeframe       string
	Title           string
	RelatedCategory *string
	Status          string
	SortOrder       int
	DueDate         *time.Time
	IsCustom        bool
	UpdatedAt       time.Time
}

// DefaultChecklist is the PRD §8.9 default timeline (H-12 bulan s/d H-hari).
// related_category, when set, matches a vendor_category so the frontend can
// link straight to the relevant part of the directory.
var DefaultChecklist = []struct {
	Timeframe       string
	Title           string
	RelatedCategory *string
}{
	{"H-12 Bulan", "Tentukan tanggal pernikahan & venue", ptr("venue")},
	{"H-12 Bulan", "Susun budget awal", nil},
	{"H-10 Bulan", "Booking venue & catering", ptr("catering")},
	{"H-8 Bulan", "Booking vendor dekorasi", ptr("decor")},
	{"H-6 Bulan", "Booking fotografer & videografer", ptr("photo_video")},
	{"H-6 Bulan", "Booking MUA & pilih gaun/jas", ptr("mua_attire")},
	{"H-4 Bulan", "Booking entertainment", ptr("entertainment")},
	{"H-4 Bulan", "Desain & pesan undangan + souvenir", ptr("invitation_souvenir")},
	{"H-2 Bulan", "Fitting baju & gladi resik", nil},
	{"H-1 Bulan", "Technical meeting dengan seluruh vendor", nil},
	{"H-1 Minggu", "Konfirmasi akhir ke semua vendor", nil},
	{"Hari-H", "Pernikahan berlangsung", nil},
}

func ptr(s string) *string { return &s }

type WeddingPlannerRepo struct {
	pool *pgxpool.Pool
}

func NewWeddingPlannerRepo(pool *pgxpool.Pool) *WeddingPlannerRepo {
	return &WeddingPlannerRepo{pool: pool}
}

// ensureSeeded creates the client's checklist from DefaultChecklist the
// first time it's needed — lazily on their first ListForClient call, or as
// a side effect of MarkDoneByCategory firing before that ever happened
// (e.g. a Client books a vendor without visiting Wedding Planner first).
// Without this, MarkDoneByCategory would silently update zero rows.
func (r *WeddingPlannerRepo) ensureSeeded(ctx context.Context, clientID string) error {
	var count int
	if err := r.pool.QueryRow(ctx, `select count(*) from wedding_planner_tasks where client_id = $1`, clientID).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for i, t := range DefaultChecklist {
		if _, err := tx.Exec(ctx, `
			insert into wedding_planner_tasks (client_id, timeframe, title, related_category, sort_order)
			values ($1, $2, $3, $4, $5)
		`, clientID, t.Timeframe, t.Title, t.RelatedCategory, i); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// ListForClient returns the client's checklist, seeding it from
// DefaultChecklist on first access (lazy seed, same pattern as Budget
// Planner's default preview — except here we persist so individual task
// statuses can be toggled by id).
func (r *WeddingPlannerRepo) ListForClient(ctx context.Context, clientID string) ([]PlannerTask, error) {
	if err := r.ensureSeeded(ctx, clientID); err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx, `
		select id, client_id, timeframe, title, related_category, status, sort_order, due_date, is_custom, updated_at
		from wedding_planner_tasks where client_id = $1 order by sort_order
	`, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []PlannerTask
	for rows.Next() {
		var t PlannerTask
		if err := rows.Scan(&t.ID, &t.ClientID, &t.Timeframe, &t.Title, &t.RelatedCategory, &t.Status, &t.SortOrder, &t.DueDate, &t.IsCustom, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

// SetDueDate sets or clears (dueDate: nil) a task's target date, scoped to
// clientID (IDOR guard, same pattern as SetStatus).
func (r *WeddingPlannerRepo) SetDueDate(ctx context.Context, clientID, taskID string, dueDate *time.Time) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		update wedding_planner_tasks set due_date = $3, updated_at = now()
		where id = $2 and client_id = $1
	`, clientID, taskID, dueDate)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

// CreateCustomTask adds a Client-authored checklist item alongside the
// seeded default ones, appended to the end of the list.
func (r *WeddingPlannerRepo) CreateCustomTask(ctx context.Context, clientID, timeframe, title string, dueDate *time.Time, relatedCategory *string) (*PlannerTask, error) {
	if err := r.ensureSeeded(ctx, clientID); err != nil {
		return nil, err
	}

	var nextOrder int
	if err := r.pool.QueryRow(ctx, `select coalesce(max(sort_order), -1) + 1 from wedding_planner_tasks where client_id = $1`, clientID).Scan(&nextOrder); err != nil {
		return nil, err
	}

	row := r.pool.QueryRow(ctx, `
		insert into wedding_planner_tasks (client_id, timeframe, title, related_category, sort_order, due_date, is_custom)
		values ($1, $2, $3, $4, $5, $6, true)
		returning id, client_id, timeframe, title, related_category, status, sort_order, due_date, is_custom, updated_at
	`, clientID, timeframe, title, relatedCategory, nextOrder, dueDate)

	var t PlannerTask
	if err := row.Scan(&t.ID, &t.ClientID, &t.Timeframe, &t.Title, &t.RelatedCategory, &t.Status, &t.SortOrder, &t.DueDate, &t.IsCustom, &t.UpdatedAt); err != nil {
		return nil, err
	}
	return &t, nil
}

// DeleteCustomTask removes a Client-authored task. Seeded default tasks
// (is_custom = false) can't be deleted this way, only toggled.
func (r *WeddingPlannerRepo) DeleteCustomTask(ctx context.Context, clientID, taskID string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		delete from wedding_planner_tasks where id = $2 and client_id = $1 and is_custom = true
	`, clientID, taskID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

// SetStatus updates a task's status, scoped to clientID so one Client can
// never toggle another Client's checklist (IDOR guard).
func (r *WeddingPlannerRepo) SetStatus(ctx context.Context, clientID, taskID, status string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		update wedding_planner_tasks set status = $3, updated_at = now()
		where id = $2 and client_id = $1
	`, clientID, taskID, status)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

// MarkDoneByCategory auto-completes any not-yet-done task linked to
// category for clientID — called when a booking with that vendor category
// reaches "confirmed" (PRD §8.9's "task otomatis tercentang"). Ensures the
// checklist is seeded first in case the Client never opened Wedding
// Planner before booking a vendor.
func (r *WeddingPlannerRepo) MarkDoneByCategory(ctx context.Context, clientID, category string) error {
	if err := r.ensureSeeded(ctx, clientID); err != nil {
		return err
	}

	_, err := r.pool.Exec(ctx, `
		update wedding_planner_tasks
		set status = 'done', updated_at = now()
		where client_id = $1 and related_category = $2 and status <> 'done'
	`, clientID, category)
	return err
}
