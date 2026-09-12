create table reviews (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid not null unique references bookings (id) on delete cascade,
    client_id uuid not null references users (id) on delete cascade,
    vendor_id uuid not null references users (id) on delete cascade,
    rating smallint not null check (rating between 1 and 5),
    comment text,
    created_at timestamptz not null default now()
);

create index reviews_vendor_idx on reviews (vendor_id);
