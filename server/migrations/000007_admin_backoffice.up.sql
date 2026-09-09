-- Agreement acceptance tracking (PRD §8.6 / §11): every Vendor/Client
-- registration must record which version of which agreement they accepted,
-- with a timestamp, as evidence for legal disputes.
create table agreement_acceptances (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users (id) on delete cascade,
    agreement_type text not null,
    version text not null,
    accepted_at timestamptz not null default now()
);

create index agreement_acceptances_user_idx on agreement_acceptances (user_id);

-- Commission override per vendor (PRD §8.10 "Konfigurasi komisi per
-- kategori/vendor"). Null means "use the platform default".
alter table vendor_profiles add column commission_rate double precision;

-- Account status for sanction enforcement (PRD §8.6 sanction ladder:
-- warning -> suspend -> terminate). Login is rejected while suspended
-- (until suspended_until) or terminated.
alter table users add column account_status text not null default 'active';
alter table users add column suspended_until timestamptz;

-- Disputes: auto-opened when a flagged chat message is sent (PRD §8.4/§8.6),
-- reviewed by Admin who then applies a sanction.
create table disputes (
    id uuid primary key default gen_random_uuid(),
    vendor_id uuid not null references users (id) on delete cascade,
    message_id uuid references messages (id) on delete set null,
    reason text not null,
    status text not null default 'open',
    sanction_applied text,
    created_at timestamptz not null default now(),
    resolved_at timestamptz
);

create index disputes_status_idx on disputes (status);
create index disputes_vendor_idx on disputes (vendor_id);
