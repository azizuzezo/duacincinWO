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

// ListForClient returns the client's checklist, seeding it from
// DefaultChecklist on first access (lazy seed, same pattern as Budget
// Planner's default preview — except here we persist so individual task
// statuses can be toggled by id).
func (r *WeddingPlannerRepo) ListForClient(ctx context.Context, clientID string) ([]PlannerTask, error) {
	var count int
	if err := r.pool.QueryRow(ctx, `select count(*) from wedding_planner_tasks where client_id = $1`, clientID).Scan(&count); err != nil {
		return nil, err
	}

	if count == 0 {
		tx, err := r.pool.Begin(ctx)
		if err != nil {
			return nil, err
		}
		defer tx.Rollback(ctx)

		for i, t := range DefaultChecklist {
			if _, err := tx.Exec(ctx, `
				insert into wedding_planner_tasks (client_id, timeframe, title, related_category, sort_order)
				values ($1, $2, $3, $4, $5)
			`, clientID, t.Timeframe, t.Title, t.RelatedCategory, i); err != nil {
				return nil, err
			}
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
	}

	rows, err := r.pool.Query(ctx, `
		select id, client_id, timeframe, title, related_category, status, sort_order, updated_at
		from wedding_planner_tasks where client_id = $1 order by sort_order
	`, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []PlannerTask
	for rows.Next() {
		var t PlannerTask
		if err := rows.Scan(&t.ID, &t.ClientID, &t.Timeframe, &t.Title, &t.RelatedCategory, &t.Status, &t.SortOrder, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
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
// reaches "confirmed" (PRD §8.9's "task otomatis tercentang"). Wired up in
// Fase 6 once bookings exist.
func (r *WeddingPlannerRepo) MarkDoneByCategory(ctx context.Context, clientID, category string) error {
	_, err := r.pool.Exec(ctx, `
		update wedding_planner_tasks
		set status = 'done', updated_at = now()
		where client_id = $1 and related_category = $2 and status <> 'done'
	`, clientID, category)
	return err
}
