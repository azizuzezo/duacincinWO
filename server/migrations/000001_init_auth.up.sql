create extension if not exists pgcrypto;

create type user_role as enum ('client', 'vendor', 'admin', 'wedding_consultant');

create table users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    password_hash text not null,
    role user_role not null,
    full_name text,
    failed_login_attempts int not null default 0,
    locked_until timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index users_role_idx on users (role);

create table otp_codes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users (id) on delete cascade,
    purpose text not null,
    code_hash text not null,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null default now()
);

create index otp_codes_user_purpose_idx on otp_codes (user_id, purpose, created_at desc);

create table rate_limit_events (
    id bigserial primary key,
    key text not null,
    action text not null,
    created_at timestamptz not null default now()
);

create index rate_limit_events_lookup_idx on rate_limit_events (key, action, created_at desc);
