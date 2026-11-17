delete from conversations where type = 'admin_vendor';
drop index if exists conversations_admin_vendor_unique_idx;
alter table conversations drop constraint if exists conversations_participants;
alter table conversations add constraint conversations_vendor_chat_has_vendor check (
    (type = 'vendor_chat' and vendor_id is not null) or
    (type = 'consultation' and vendor_id is null)
);
alter table conversations alter column client_id set not null;
alter table conversations drop column if exists admin_id;
