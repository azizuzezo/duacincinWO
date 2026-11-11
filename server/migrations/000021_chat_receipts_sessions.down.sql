alter table conversations
    drop column if exists closed_by,
    drop column if exists closed_at;

drop index if exists messages_unread_idx;
drop index if exists messages_undelivered_idx;

alter table messages
    drop column if exists read_at,
    drop column if exists delivered_at;
