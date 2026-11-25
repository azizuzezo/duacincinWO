-- Runtime override for Kirana's LLM (base URL, model, key, reasoning). One
-- row, edited from the admin panel so switching provider/model needs no
-- redeploy. The AI_* environment variables are ignored.
create table ai_settings (
    id boolean primary key default true check (id),
    base_url text not null default '',
    model text not null default '',
    api_key text not null default '',
    reasoning_effort text not null default '',
    updated_by uuid references users (id) on delete set null,
    updated_at timestamptz not null default now()
);
