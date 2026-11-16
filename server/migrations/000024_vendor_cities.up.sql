-- A vendor can serve several kabupaten/kota, each picked from the national
-- list (internal/wilayah): {Bandung,Sumedang} instead of "Bandung sumedang".
-- city stays as the joined display form ("Bandung, Sumedang") for every
-- place that only shows it. Existing free-text rows are split into list
-- entries at API startup (app.backfillVendorCities) when every word matches.
alter table vendor_profiles add column cities text[] not null default '{}';

create index vendor_profiles_cities_idx on vendor_profiles using gin (cities);
