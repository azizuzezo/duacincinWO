-- Links a WhatsApp phone number to a DuaCincin account, and tracks the
-- bot's per-phone conversation state (linking flow, current menu, which
-- conversation the phone is currently relaying to). No phone column is
-- added to users — this table is the single source of truth so the two
-- never drift.
create table whatsapp_links (
    id uuid primary key default gen_random_uuid(),
    phone text not null unique,
    jid text not null,
    user_id uuid references users (id) on delete cascade,
    link_state text not null default 'awaiting_email',
    pending_email text,
    pending_otp_user_id uuid references users (id) on delete cascade,
    active_conversation_id uuid references conversations (id) on delete set null,
    pending_menu jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint whatsapp_links_state_check check (link_state in ('awaiting_email', 'awaiting_otp', 'linked'))
);

create unique index whatsapp_links_user_idx on whatsapp_links (user_id) where user_id is not null;
