create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  topic text not null default '',
  cover_url text not null default '',
  cover_alt text not null default '',
  body jsonb not null default '{"type":"doc","content":[]}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_name text not null default '',
  reading_minutes int not null default 1,
  published_at timestamptz null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_status_published_idx on articles (status, published_at desc);
create index articles_updated_idx on articles (updated_at desc);
