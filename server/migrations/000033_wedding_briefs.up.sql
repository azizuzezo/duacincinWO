-- Brief → Vendor: a couple describes what they need once (Kirana prepares it,
-- internal/briefs), then sends it to up to 5 matching vendors. Each vendor
-- receives it as the first message of an ordinary vendor chat, so replies,
-- notifications and the contact filter all use the existing chat. These tables
-- only record who sent what to whom: the daily limit, no repeat sends to the
-- same vendor, and later, how many briefs turn into bookings.
create table wedding_briefs (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references users (id) on delete cascade,
    category text not null,
    city text not null default '',
    event_date text not null default '',
    guests int check (guests is null or guests between 1 and 100000),
    style text not null default '',
    budget_max bigint check (budget_max is null or budget_max >= 0),
    notes text not null default '',
    created_at timestamptz not null default now()
);
create index wedding_briefs_client_idx on wedding_briefs (client_id, created_at desc);

create table wedding_brief_recipients (
    brief_id uuid not null references wedding_briefs (id) on delete cascade,
    vendor_id uuid not null references users (id) on delete cascade,
    conversation_id uuid references conversations (id) on delete set null,
    created_at timestamptz not null default now(),
    primary key (brief_id, vendor_id)
);
create index wedding_brief_recipients_vendor_idx on wedding_brief_recipients (vendor_id, created_at desc);
