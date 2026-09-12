alter table messages
    drop column if exists reply_to_message_id,
    drop column if exists attachment_url,
    drop column if exists attachment_type;
