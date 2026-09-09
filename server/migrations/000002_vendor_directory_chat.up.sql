create type vendor_category as enum (
    'venue', 'catering', 'decor', 'mua_attire', 'photo_video', 'entertainment', 'invitation_souvenir'
);

create type vendor_status as enum ('pending', 'approved', 'rejected');

create table vendor_profiles (
    user_id uuid primary key references users (id) on delete cascade,
    business_name text not null,
    category vendor_category not null,
    city text not null,
    price_min bigint not null default 0,
    price_max bigint not null default 0,
    description text not null default '',
    status vendor_status not null default 'pending',
    rejection_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index vendor_profiles_status_category_idx on vendor_profiles (status, category);

create table vendor_portfolio_items (
    id uuid primary key default gen_random_uuid(),
    vendor_id uuid not null references users (id) on delete cascade,
    storage_path text not null,
    public_url text not null,
    alt_text text not null default '',
    sort_order int not null default 0,
    created_at timestamptz not null default now()
);

create index vendor_portfolio_items_vendor_idx on vendor_portfolio_items (vendor_id, sort_order);

create type conversation_type as enum ('vendor_chat', 'consultation');

create table conversations (
    id uuid primary key default gen_random_uuid(),
    type conversation_type not null,
    client_id uuid not null references users (id) on delete cascade,
    vendor_id uuid references users (id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint conversations_vendor_chat_has_vendor check (
        (type = 'vendor_chat' and vendor_id is not null) or
        (type = 'consultation' and vendor_id is null)
    )
);

create unique index conversations_vendor_chat_unique_idx on conversations (client_id, vendor_id) where type = 'vendor_chat';
create unique index conversations_consultation_unique_idx on conversations (client_id) where type = 'consultation';

create table messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references conversations (id) on delete cascade,
    sender_id uuid not null references users (id) on delete cascade,
    body text not null,
    flagged boolean not null default false,
    created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);
