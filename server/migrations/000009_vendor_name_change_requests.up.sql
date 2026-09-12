-- Business name changes need Admin approval (with a reason from the
-- vendor), separate from the rest of the profile which now saves
-- immediately. A discrete request/resolve record, not a diff/audit table,
-- following the same shape as the existing dispute flow.
create table vendor_name_change_requests (
    id uuid primary key default gen_random_uuid(),
    vendor_id uuid not null references users (id) on delete cascade,
    current_name text not null,
    requested_name text not null,
    reason text not null,
    status text not null default 'pending',
    admin_note text,
    created_at timestamptz not null default now(),
    resolved_at timestamptz
);

create index vendor_name_change_requests_vendor_idx on vendor_name_change_requests (vendor_id);
create index vendor_name_change_requests_status_idx on vendor_name_change_requests (status);
