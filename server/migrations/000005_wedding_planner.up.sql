create table wedding_planner_tasks (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references users (id) on delete cascade,
    timeframe text not null,
    title text not null,
    related_category text,
    status text not null default 'todo',
    sort_order int not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index wedding_planner_tasks_client_idx on wedding_planner_tasks (client_id, sort_order);
