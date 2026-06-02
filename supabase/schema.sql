-- ===========================================================================
-- Swaccho Purulia — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- ===========================================================================

-- 1. Complaints table -------------------------------------------------------
create table if not exists public.complaints (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  photo_url   text,
  latitude    double precision not null,
  longitude   double precision not null,
  category    text not null default 'garbage',
  note        text,
  ward_id     integer,
  ward_name   text,
  mla         text,
  mp          text,
  status      text not null default 'reported'
              check (status in ('reported', 'in_progress', 'resolved'))
);

create index if not exists complaints_created_at_idx on public.complaints (created_at desc);
create index if not exists complaints_ward_idx       on public.complaints (ward_id);

-- 2. Row Level Security -----------------------------------------------------
alter table public.complaints enable row level security;

-- Anyone (anonymous) can read complaints — this powers the public map.
drop policy if exists "public read complaints" on public.complaints;
create policy "public read complaints"
  on public.complaints for select
  using (true);

-- Anyone can submit a complaint anonymously, but only with a safe default
-- status (citizens can't mark their own report "resolved").
drop policy if exists "anon insert complaints" on public.complaints;
create policy "anon insert complaints"
  on public.complaints for insert
  with check (status = 'reported');

-- Note: citizen inserts are limited to status='reported' above. Officials mark
-- issues in_progress/resolved via the admin allowlist policy below.

-- 2a. Admin allowlist + status updates --------------------------------------
-- Add an admin by email AFTER they have signed in once via Supabase Auth:
--   insert into public.admins (email) values ('official@example.com');
create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- No anon policies: the allowlist is managed via the SQL editor / service role.

-- True when the current authenticated user is on the admin allowlist.
create or replace function public.is_admin()
  returns boolean
  language sql
  security definer
  set search_path = public
  as $$ select exists (
    select 1 from public.admins where email = (auth.jwt() ->> 'email')
  ) $$;
grant execute on function public.is_admin() to anon, authenticated;

-- Allow admins to update a complaint's status (e.g. mark resolved).
drop policy if exists "admin update complaints" on public.complaints;
create policy "admin update complaints"
  on public.complaints for update
  using (public.is_admin())
  with check (status in ('reported', 'in_progress', 'resolved'));

-- 2b. Realtime --------------------------------------------------------------
-- Stream INSERT/UPDATE events to the browser so the public map and leaderboard
-- update live for every viewer (see src/lib/complaints.js subscribeToComplaints).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'complaints'
  ) then
    alter publication supabase_realtime add table public.complaints;
  end if;
end $$;

-- 2c. Weekly digest subscribers ---------------------------------------------
create table if not exists public.subscribers (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email      text not null unique,
  name       text
);

alter table public.subscribers enable row level security;

-- Anyone can subscribe. There is deliberately NO select policy, so the public
-- anon key cannot read the email list back.
drop policy if exists "anon insert subscribers" on public.subscribers;
create policy "anon insert subscribers"
  on public.subscribers for insert
  with check (true);

-- Expose only an aggregate count (not the emails) to the public UI.
create or replace function public.subscriber_count()
  returns bigint
  language sql
  security definer
  set search_path = public
  as $$ select count(*) from public.subscribers $$;
grant execute on function public.subscriber_count() to anon, authenticated;

-- 3. Storage bucket for photos ----------------------------------------------
insert into storage.buckets (id, name, public)
values ('complaint-photos', 'complaint-photos', true)
on conflict (id) do nothing;

-- Public read of photos.
drop policy if exists "public read photos" on storage.objects;
create policy "public read photos"
  on storage.objects for select
  using (bucket_id = 'complaint-photos');

-- Anonymous uploads into the complaint-photos bucket.
drop policy if exists "anon upload photos" on storage.objects;
create policy "anon upload photos"
  on storage.objects for insert
  with check (bucket_id = 'complaint-photos');
