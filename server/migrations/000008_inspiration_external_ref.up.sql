-- Tracks where an externally-sourced Inspirasi item came from (e.g.
-- "pinterest:<pin_id>"), so re-running a sync never imports the same item
-- twice. Null for items uploaded directly by an Admin.
alter table inspiration_items add column external_ref text;
create unique index inspiration_items_external_ref_idx on inspiration_items (external_ref) where external_ref is not null;
