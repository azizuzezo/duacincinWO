package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Notification struct {
	ID        string
	UserID    string
	Type      string
	Title     string
	Body      string
	Link      *string
	ReadAt    *time.Time
	CreatedAt time.Time
}

type NotificationRepo struct {
	pool *pgxpool.Pool
}

func NewNotificationRepo(pool *pgxpool.Pool) *NotificationRepo {
	return &NotificationRepo{pool: pool}
}

func (r *NotificationRepo) Create(ctx context.Context, userID, notifType, title, body string, link *string) error {
	_, err := r.pool.Exec(ctx, `
		insert into notifications (user_id, type, title, body, link)
		values ($1, $2, $3, $4, $5)
	`, userID, notifType, title, body, link)
	return err
}

func (r *NotificationRepo) ListForUser(ctx context.Context, userID string, limit int) ([]Notification, error) {
	rows, err := r.pool.Query(ctx, `
		select id, user_id, type, title, body, link, read_at, created_at
		from notifications where user_id = $1 order by created_at desc limit $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Body, &n.Link, &n.ReadAt, &n.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func (r *NotificationRepo) CountUnread(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `select count(*) from notifications where user_id = $1 and read_at is null`, userID).Scan(&count)
	return count, err
}

// MarkRead marks one notification read, scoped to userID (IDOR guard).
func (r *NotificationRepo) MarkRead(ctx context.Context, userID, id string) error {
	_, err := r.pool.Exec(ctx, `
		update notifications set read_at = now() where id = $2 and user_id = $1 and read_at is null
	`, userID, id)
	return err
}

func (r *NotificationRepo) MarkAllRead(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, `
		update notifications set read_at = now() where user_id = $1 and read_at is null
	`, userID)
	return err
}
