-- Admin <-> Vendor chat (000028). Its own migration: a new enum value can
-- only be used after the transaction that adds it has committed.
alter type conversation_type add value if not exists 'admin_vendor';
