package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditLogEntry struct {
	ID        string
	ActorID   string
	ActorRole string
	// ActorName and ActorEmail are who the actor is now (joined from users;
	// actor_id cascades on delete, so the user always exists).
	ActorName  string
	ActorEmail string
	Action     string
	TargetType string
	TargetID   string
	Metadata   map[string]any
	CreatedAt  time.Time
}

type AuditLogRepo struct {
	pool *pgxpool.Pool
}

func NewAuditLogRepo(pool *pgxpool.Pool) *AuditLogRepo {
	return &AuditLogRepo{pool: pool}
}

// Create records one admin action. Callers pass metadata: nil when there's
// nothing beyond action/target worth capturing.
func (r *AuditLogRepo) Create(ctx context.Context, actorID, actorRole, action, targetType, targetID string, metadata map[string]any) error {
	_, err := r.pool.Exec(ctx, `
		insert into admin_audit_log (actor_id, actor_role, action, target_type, target_id, metadata)
		values ($1, $2, $3, $4, $5, $6)
	`, actorID, actorRole, action, targetType, targetID, metadata)
	return err
}

func (r *AuditLogRepo) List(ctx context.Context, limit, offset int) ([]AuditLogEntry, error) {
	rows, err := r.pool.Query(ctx, `
		select l.id, l.actor_id, l.actor_role, u.full_name, u.email, l.action, l.target_type, l.target_id, l.metadata, l.created_at
		from admin_audit_log l join users u on u.id = l.actor_id
		order by l.created_at desc limit $1 offset $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []AuditLogEntry
	for rows.Next() {
		var e AuditLogEntry
		if err := rows.Scan(&e.ID, &e.ActorID, &e.ActorRole, &e.ActorName, &e.ActorEmail, &e.Action, &e.TargetType, &e.TargetID, &e.Metadata, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// ListByAction returns the latest entries of one action, newest first.
func (r *AuditLogRepo) ListByAction(ctx context.Context, action string, limit int) ([]AuditLogEntry, error) {
	rows, err := r.pool.Query(ctx, `
		select l.id, l.actor_id, l.actor_role, u.full_name, u.email, l.action, l.target_type, l.target_id, l.metadata, l.created_at
		from admin_audit_log l join users u on u.id = l.actor_id
		where l.action = $1
		order by l.created_at desc limit $2
	`, action, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []AuditLogEntry
	for rows.Next() {
		var e AuditLogEntry
		if err := rows.Scan(&e.ID, &e.ActorID, &e.ActorRole, &e.ActorName, &e.ActorEmail, &e.Action, &e.TargetType, &e.TargetID, &e.Metadata, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// LoggedSince reports whether actorID already logged action on targetID
// within the last window (to keep "viewed" entries from flooding the log).
func (r *AuditLogRepo) LoggedSince(ctx context.Context, actorID, action, targetID string, window time.Duration) (bool, error) {
	var ok bool
	err := r.pool.QueryRow(ctx, `
		select exists(select 1 from admin_audit_log
			where actor_id = $1 and action = $2 and target_id = $3 and created_at > now() - make_interval(secs => $4))
	`, actorID, action, targetID, window.Seconds()).Scan(&ok)
	return ok, err
}
