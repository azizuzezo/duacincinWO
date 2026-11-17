-- Admin <-> Vendor chat: one conversation per (admin, vendor). The admin
-- starts it; the vendor replies. There is no client side, so client_id
-- becomes nullable and each type states exactly which participants it has.
alter table conversations add column admin_id uuid references users (id) on delete cascade;
alter table conversations alter column client_id drop not null;

alter table conversations drop constraint conversations_vendor_chat_has_vendor;
alter table conversations add constraint conversations_participants check (
    (type = 'vendor_chat' and client_id is not null and vendor_id is not null and admin_id is null) or
    (type = 'consultation' and client_id is not null and vendor_id is null and admin_id is null) or
    (type = 'admin_vendor' and admin_id is not null and vendor_id is not null and client_id is null)
);

create unique index conversations_admin_vendor_unique_idx on conversations (admin_id, vendor_id) where type = 'admin_vendor';
