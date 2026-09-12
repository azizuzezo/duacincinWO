create table conversation_reads (
    conversation_id uuid not null references conversations (id) on delete cascade,
    user_id uuid not null references users (id) on delete cascade,
    last_read_message_id uuid references messages (id) on delete set null,
    updated_at timestamptz not null default now(),
    primary key (conversation_id, user_id)
);
