create type budget_category as enum (
    'venue_catering', 'decor', 'photo_video', 'mua_attire', 'entertainment', 'invitation_souvenir', 'reserve'
);

create table budget_plans (
    client_id uuid primary key references users (id) on delete cascade,
    total_budget bigint not null default 0,
    guest_count int not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table budget_plan_categories (
    plan_client_id uuid not null references budget_plans (client_id) on delete cascade,
    category budget_category not null,
    percentage double precision not null,
    primary key (plan_client_id, category)
);
