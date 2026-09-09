create type booking_status as enum (
    'requested', 'confirmed', 'dp_paid', 'full_paid', 'completed', 'cancelled', 'disputed', 'refunded'
);

create table bookings (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references users (id) on delete cascade,
    vendor_id uuid not null references users (id) on delete cascade,
    event_date date not null,
    package_description text not null default '',
    agreed_price bigint not null,
    dp_amount bigint not null,
    status booking_status not null default 'requested',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index bookings_client_idx on bookings (client_id);
create index bookings_vendor_idx on bookings (vendor_id);

create table transactions (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid not null references bookings (id) on delete cascade,
    type text not null,
    amount bigint not null,
    status text not null default 'pending',
    provider_order_id text not null unique,
    paid_at timestamptz,
    created_at timestamptz not null default now()
);

create index transactions_booking_idx on transactions (booking_id, type);

create table meetings (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid references bookings (id) on delete cascade,
    client_id uuid not null references users (id) on delete cascade,
    type text not null,
    scheduled_at timestamptz not null,
    meeting_link text not null default '',
    status text not null default 'scheduled',
    created_at timestamptz not null default now(),
    constraint meetings_technical_needs_booking check (
        (type = 'technical_meeting' and booking_id is not null) or
        (type = 'consultant_meeting' and booking_id is null)
    )
);

create index meetings_client_idx on meetings (client_id);
create index meetings_booking_idx on meetings (booking_id);

create table disbursements (
    booking_id uuid primary key references bookings (id) on delete cascade,
    gross_amount bigint not null,
    commission_amount bigint not null,
    net_amount bigint not null,
    status text not null default 'pending',
    disbursed_at timestamptz,
    created_at timestamptz not null default now()
);
