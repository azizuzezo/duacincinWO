package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AIChatRepo stores Kirana (landing AI assistant) conversations; see
// migration 000029 for the ownership rules.
type AIChatRepo struct {
	pool *pgxpool.Pool
}

func NewAIChatRepo(pool *pgxpool.Pool) *AIChatRepo {
	return &AIChatRepo{pool: pool}
}

type AIChatTurn struct {
	ID        int64
	Role      string
	Content   string
	Parts     json.RawMessage
	Steps     json.RawMessage
	State     string
	Error     string
	CreatedAt time.Time
}

// SessionForDevice returns the anonymous session of a device, or "" when
// it has none yet. A session already handed to a user is not returned:
// after logging out, the next visitor on that device starts clean.
func (r *AIChatRepo) SessionForDevice(ctx context.Context, deviceHash string) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, `select id from ai_chat_sessions where device_hash = $1 and user_id is null`, deviceHash).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return id, err
}

// SessionForUser returns the user's session. When the user has none, the
// device's anonymous session (if any) becomes theirs, so a chat started
// before signing up continues in the account. "" when neither exists.
func (r *AIChatRepo) SessionForUser(ctx context.Context, userID, deviceHash string) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, `select id from ai_chat_sessions where user_id = $1`, userID).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}
	if deviceHash == "" {
		return "", nil
	}
	// Claim it and detach it from the device.
	err = r.pool.QueryRow(ctx, `
		update ai_chat_sessions set user_id = $1, device_hash = null, updated_at = now()
		where device_hash = $2 and user_id is null
		returning id
	`, userID, deviceHash).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return id, err
}

// CreateSession makes a session for a device or a user (one of them set).
func (r *AIChatRepo) CreateSession(ctx context.Context, deviceHash, userID string) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, `
		insert into ai_chat_sessions (device_hash, user_id) values (nullif($1, ''), nullif($2, '')::uuid)
		on conflict do nothing
		returning id
	`, deviceHash, userID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		// Lost a race with a parallel request from the same visitor.
		if userID != "" {
			return r.SessionForUser(ctx, userID, "")
		}
		return r.SessionForDevice(ctx, deviceHash)
	}
	return id, err
}

func (r *AIChatRepo) AddTurn(ctx context.Context, sessionID string, t AIChatTurn) error {
	state := t.State
	if state == "" {
		state = "done"
	}
	_, err := r.pool.Exec(ctx, `
		insert into ai_chat_turns (session_id, role, content, parts, steps, state, error)
		values ($1, $2, $3, $4, $5, $6, nullif($7, ''))
	`, sessionID, t.Role, t.Content, nullJSON(t.Parts), nullJSON(t.Steps), state, t.Error)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `update ai_chat_sessions set updated_at = now() where id = $1`, sessionID)
	return err
}

// RecentTurns returns the latest `limit` turns, oldest first.
func (r *AIChatRepo) RecentTurns(ctx context.Context, sessionID string, limit int) ([]AIChatTurn, error) {
	rows, err := r.pool.Query(ctx, `
		select id, role, content, coalesce(parts, 'null'::jsonb), coalesce(steps, 'null'::jsonb), state, coalesce(error, ''), created_at
		from (
			select * from ai_chat_turns where session_id = $1 order by id desc limit $2
		) t order by id
	`, sessionID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AIChatTurn
	for rows.Next() {
		var t AIChatTurn
		if err := rows.Scan(&t.ID, &t.Role, &t.Content, &t.Parts, &t.Steps, &t.State, &t.Error, &t.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// ClearTurns empties a session ("Mulai baru").
func (r *AIChatRepo) ClearTurns(ctx context.Context, sessionID string) error {
	_, err := r.pool.Exec(ctx, `delete from ai_chat_turns where session_id = $1`, sessionID)
	return err
}

func nullJSON(b json.RawMessage) any {
	if len(b) == 0 || string(b) == "null" {
		return nil
	}
	return []byte(b)
}

// AIVisitor is what a visitor told Kirana about themselves (both optional).
type AIVisitor struct {
	Name string
	Age  int
}

// Visitor returns the session's visitor profile (zero value when unknown).
func (r *AIChatRepo) Visitor(ctx context.Context, sessionID string) (AIVisitor, error) {
	var v AIVisitor
	err := r.pool.QueryRow(ctx, `select coalesce(visitor_name, ''), coalesce(visitor_age, 0) from ai_chat_sessions where id = $1`, sessionID).Scan(&v.Name, &v.Age)
	if errors.Is(err, pgx.ErrNoRows) {
		return AIVisitor{}, nil
	}
	return v, err
}

// SetVisitor stores the visitor's name and age (age 0 = not given).
func (r *AIChatRepo) SetVisitor(ctx context.Context, sessionID string, v AIVisitor) error {
	_, err := r.pool.Exec(ctx, `
		update ai_chat_sessions set visitor_name = nullif($2, ''), visitor_age = nullif($3, 0), updated_at = now() where id = $1
	`, sessionID, v.Name, v.Age)
	return err
}
