-- Days a vendor closed by hand. A day is also unavailable when the vendor
-- has a confirmed, dp_paid or full_paid booking on it (derived, not stored).
create table vendor_blocked_dates (
    vendor_id  uuid not null references users(id) on delete cascade,
    day        date not null,
    created_at timestamptz not null default now(),
    primary key (vendor_id, day)
);
