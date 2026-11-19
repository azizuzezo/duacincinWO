-- WhatsApp numbers are now required on every client and vendor account and
-- are proven by a code sent to that number over WhatsApp (the official
-- DuaCincin number), so a typo never routes someone's chats to a stranger.
-- whatsapp_links stays the single source of truth for a *verified* number;
-- this table only holds the number being verified and its pending code.
create table whatsapp_verifications (
    user_id uuid primary key references users (id) on delete cascade,
    phone text not null,
    code_hash text,
    expires_at timestamptz,
    attempts int not null default 0,
    sent_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
