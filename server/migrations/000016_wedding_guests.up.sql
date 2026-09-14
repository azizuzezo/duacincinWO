create type guest_rsvp_status as enum ('pending', 'attending', 'not_attending');
create type guest_source as enum ('manual', 'rsvp_form');

create table wedding_rsvp_links (
    client_id uuid primary key references users (id) on delete cascade,
    token text not null unique,
    event_name text not null default '',
    event_date date,
    venue_note text not null default '',
    created_at timestamptz not null default now()
);

create table wedding_guests (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references users (id) on delete cascade,
    name text not null,
    phone text not null default '',
    party_size int not null default 1,
    rsvp_status guest_rsvp_status not null default 'pending',
    message text not null default '',
    source guest_source not null default 'manual',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index wedding_guests_client_idx on wedding_guests (client_id);
