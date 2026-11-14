-- Vendor yang ikut mengerjakan pernikahan di satu foto Inspirasi (dekorasi,
-- MUA, fotografer, dst). Admin yang menandai, karena galeri Inspirasi adalah
-- kurasi tim DuaCincin. Profil vendor sudah publik (lihat engineering.md),
-- jadi tag ini boleh tampil tanpa login; chat dan booking tetap butuh akun.
create table inspiration_vendor_tags (
    inspiration_id uuid not null references inspiration_items (id) on delete cascade,
    vendor_id uuid not null references vendor_profiles (user_id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (inspiration_id, vendor_id)
);

create index inspiration_vendor_tags_vendor_idx on inspiration_vendor_tags (vendor_id);
