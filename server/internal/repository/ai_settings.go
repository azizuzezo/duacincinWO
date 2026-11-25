package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AISettingsRepo holds the admin-editable LLM configuration for Kirana
// (migration 000032). The AI_* env vars are not consulted.
type AISettingsRepo struct {
	pool *pgxpool.Pool
}

func NewAISettingsRepo(pool *pgxpool.Pool) *AISettingsRepo {
	return &AISettingsRepo{pool: pool}
}

type AISettings struct {
	BaseURL         string
	Model           string
	APIKey          string
	ReasoningEffort string
}

func (r *AISettingsRepo) Get(ctx context.Context) (AISettings, error) {
	var s AISettings
	err := r.pool.QueryRow(ctx, `select base_url, model, api_key, reasoning_effort from ai_settings where id`).
		Scan(&s.BaseURL, &s.Model, &s.APIKey, &s.ReasoningEffort)
	if errors.Is(err, pgx.ErrNoRows) {
		return AISettings{}, nil
	}
	return s, err
}

// Save replaces the row. An empty APIKey keeps the stored key, so the admin
// form never has to echo the secret back.
func (r *AISettingsRepo) Save(ctx context.Context, s AISettings, updatedBy string) error {
	_, err := r.pool.Exec(ctx, `
		insert into ai_settings (id, base_url, model, api_key, reasoning_effort, updated_by, updated_at)
		values (true, $1, $2, $3, $4, $5, now())
		on conflict (id) do update set
			base_url = excluded.base_url,
			model = excluded.model,
			api_key = case when excluded.api_key = '' then ai_settings.api_key else excluded.api_key end,
			reasoning_effort = excluded.reasoning_effort,
			updated_by = excluded.updated_by,
			updated_at = now()
	`, s.BaseURL, s.Model, s.APIKey, s.ReasoningEffort, updatedBy)
	return err
}
