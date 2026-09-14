create table wedding_seating_tables (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references users (id) on delete cascade,
    name text not null,
    capacity int not null default 8,
    sort_order int not null default 0,
    created_at timestamptz not null default now()
);

create index wedding_seating_tables_client_idx on wedding_seating_tables (client_id, sort_order);

create table wedding_seating_assignments (
    id uuid primary key default gen_random_uuid(),
    table_id uuid not null references wedding_seating_tables (id) on delete cascade,
    guest_id uuid not null unique references wedding_guests (id) on delete cascade,
    created_at timestamptz not null default now()
);

create index wedding_seating_assignments_table_idx on wedding_seating_assignments (table_id);
