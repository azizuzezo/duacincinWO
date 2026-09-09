drop table if exists disputes;
alter table users drop column if exists suspended_until;
alter table users drop column if exists account_status;
alter table vendor_profiles drop column if exists commission_rate;
drop table if exists agreement_acceptances;
