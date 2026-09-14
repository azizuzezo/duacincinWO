create table wedding_rundown_items (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references users (id) on delete cascade,
    -- "HH:MM" 24h, stored as text (not a SQL time type) so it sorts
    -- correctly as a plain string and stays simple to scan.
    start_time text not null,
    title text not null,
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index wedding_rundown_items_client_idx on wedding_rundown_items (client_id, start_time);
