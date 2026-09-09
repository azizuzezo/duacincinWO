create table inspiration_items (
    id uuid primary key default gen_random_uuid(),
    category text not null,
    storage_path text not null,
    public_url text not null,
    alt_text text not null default '',
    caption text not null default '',
    source_credit text not null default '',
    created_at timestamptz not null default now()
);

create index inspiration_items_category_idx on inspiration_items (category);
