-- Kirana, the landing AI assistant (internal/aiassist): conversation history
-- for visitors who have not logged in. A session belongs to one device (a
-- random id in an HttpOnly cookie, stored here only as a SHA-256 hash) or,
-- once its visitor logs in, to that user. Never keyed by IP: one IP is often
-- shared by strangers (office wifi, mobile carrier NAT).
create table ai_chat_sessions (
    id uuid primary key default gen_random_uuid(),
    device_hash text unique,
    user_id uuid references users (id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ai_chat_sessions_owner check (device_hash is not null or user_id is not null)
);
create unique index ai_chat_sessions_user_idx on ai_chat_sessions (user_id) where user_id is not null;

-- One row per visitor message or assistant reply. content is what the model
-- is given as history; parts/steps are what the landing renders (text and
-- cards as they were shown).
create table ai_chat_turns (
    id bigserial primary key,
    session_id uuid not null references ai_chat_sessions (id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null default '',
    parts jsonb,
    steps jsonb,
    state text not null default 'done' check (state in ('done', 'error')),
    error text,
    created_at timestamptz not null default now()
);
create index ai_chat_turns_session_idx on ai_chat_turns (session_id, id);
