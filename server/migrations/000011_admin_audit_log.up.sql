create table admin_audit_log (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid not null references users (id) on delete cascade,
    actor_role text not null,
    action text not null,
    target_type text not null,
    target_id text not null,
    metadata jsonb,
    created_at timestamptz not null default now()
);

create index admin_audit_log_created_idx on admin_audit_log (created_at desc);
