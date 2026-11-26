alter table messages
    drop column if exists attachment_size,
    drop column if exists attachment_name,
    drop column if exists retracted_at,
    drop column if exists edited_at;
