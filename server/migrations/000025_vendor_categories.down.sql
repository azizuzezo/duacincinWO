-- Postgres cannot drop enum values, so the added vendor_category values stay.
drop index if exists vendor_profiles_categories_idx;
alter table vendor_profiles drop column if exists categories;
