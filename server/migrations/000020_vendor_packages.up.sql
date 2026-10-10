-- Paket harga yang ditampilkan vendor di profil publik (Fase E). price_min /
-- price_max di vendor_profiles tetap dipakai direktori; paket adalah rincian.
create table vendor_packages (
    id uuid primary key default gen_random_uuid(),
    vendor_id uuid not null references users (id) on delete cascade,
    name text not null,
    description text not null default '',
    price bigint not null check (price >= 0),
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index vendor_packages_vendor_idx on vendor_packages (vendor_id, sort_order, created_at);
