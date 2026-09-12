alter table messages
    add column reply_to_message_id uuid references messages (id) on delete set null,
    add column attachment_url text,
    add column attachment_type text;
