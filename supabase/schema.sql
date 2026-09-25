-- Run this file once in the Supabase SQL editor.
-- Every application table is protected by Row Level Security.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  email text not null,
  school text not null default '' check (char_length(school) <= 150),
  course text not null default '' check (char_length(course) <= 150),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('module', 'group')),
  name text not null check (char_length(name) between 1 and 80),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now()
);

create unique index if not exists collections_user_type_name_unique
  on public.collections (user_id, type, lower(name));

create table if not exists public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('assignment', 'event')),
  title text not null check (char_length(title) between 1 and 200),
  item_date date not null,
  item_time time not null,
  collection_name text not null check (char_length(collection_name) between 1 and 80),
  collection_color text not null check (collection_color ~ '^#[0-9A-Fa-f]{6}$'),
  danger_days integer check (danger_days between 0 and 365),
  amber_days integer check (amber_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_thresholds_valid check (
    (kind = 'event' and danger_days is null and amber_days is null)
    or (kind = 'assignment' and danger_days is not null and amber_days is not null and amber_days > danger_days)
  )
);

create index if not exists calendar_items_user_date_idx
  on public.calendar_items (user_id, item_date, item_time);

alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.calendar_items enable row level security;

revoke all on table public.profiles, public.collections, public.calendar_items from anon;
grant select, insert, update, delete on table public.profiles, public.collections, public.calendar_items to authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated
  using ((select auth.uid()) = id);

create policy "collections_select_own" on public.collections for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "collections_insert_own" on public.collections for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "collections_update_own" on public.collections for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "collections_delete_own" on public.collections for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "calendar_items_select_own" on public.calendar_items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "calendar_items_insert_own" on public.calendar_items for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "calendar_items_update_own" on public.calendar_items for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "calendar_items_delete_own" on public.calendar_items for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
