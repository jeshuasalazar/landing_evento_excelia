create extension if not exists citext;

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  email citext not null,
  status text not null default 'registered',
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  page_url text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_registrations_unique_email unique (event_slug, email)
);

alter table public.event_registrations enable row level security;

create index if not exists event_registrations_event_created_idx
  on public.event_registrations (event_slug, created_at desc);

-- Validacion
-- select to_regclass('public.event_registrations');
-- select relrowsecurity from pg_class where oid = 'public.event_registrations'::regclass;
-- select conname from pg_constraint where conrelid='public.event_registrations'::regclass and contype='u';
