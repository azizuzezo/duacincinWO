drop index if exists inspiration_items_external_ref_idx;
alter table inspiration_items drop column if exists external_ref;
