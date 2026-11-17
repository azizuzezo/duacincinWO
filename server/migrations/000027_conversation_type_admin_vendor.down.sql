-- Postgres cannot drop an enum value; 'admin_vendor' stays (unused after
-- 000028 is rolled back).
select 1;
