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

-- Note: updates/deletes (e.g. an official marking an issue resolved) are NOT
-- granted here. Do those with the service-role key from a trusted admin
-- context, or add an authenticated-admin policy.

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
