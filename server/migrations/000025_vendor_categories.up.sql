-- More vendor categories (hantaran/seserahan, MC, wedding content creator,
-- mobil pengantin, kue pengantin), and several categories per vendor: one
-- business can do MC and entertainment, or decor and hantaran.
-- category stays as the vendor's main category (the first of categories),
-- used where one category is needed: budget spending, planner tasks.
alter type vendor_category add value if not exists 'hantaran';
alter type vendor_category add value if not exists 'mc';
alter type vendor_category add value if not exists 'content_creator';
alter type vendor_category add value if not exists 'wedding_car';
alter type vendor_category add value if not exists 'wedding_cake';

alter table vendor_profiles add column categories vendor_category[] not null default '{}';
update vendor_profiles set categories = array[category];

create index vendor_profiles_categories_idx on vendor_profiles using gin (categories);
