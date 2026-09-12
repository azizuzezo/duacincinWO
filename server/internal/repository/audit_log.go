package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditLogEntry struct {
	ID         string
	ActorID    string
	ActorRole  string
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
		select id, actor_id, actor_role, action, target_type, target_id, metadata, created_at
		from admin_audit_log order by created_at desc limit $1 offset $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []AuditLogEntry
	for rows.Next() {
		var e AuditLogEntry
		if err := rows.Scan(&e.ID, &e.ActorID, &e.ActorRole, &e.Action, &e.TargetType, &e.TargetID, &e.Metadata, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}
