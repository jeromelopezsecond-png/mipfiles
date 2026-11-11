-- MIPMIP FILES: accounts, roles, and Row Level Security (fresh install)
-- Run once in Supabase: SQL Editor > New query > paste > Run
-- Already ran an older version of this file? Run 002_add_username.sql instead.

create type public.app_role as enum ('student', 'moderator', 'admin');

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null check (char_length(full_name) <= 40),
  username    text check (username ~ '^[a-z0-9_]{3,20}$'),
  code_name   text check (char_length(code_name) <= 24),
  course      text,
  year_level  int check (year_level between 1 and 4),
  section     text check (char_length(section) <= 20),  -- not collected at sign-up for now
  role        public.app_role not null default 'student',
  suspended   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create unique index profiles_username_key on public.profiles (lower(username));

-- Profile is created automatically at sign-up. Role is ALWAYS 'student' here.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, username, code_name, course, year_level)
  values (
    new.id,
    new.email,
    coalesce(nullif(left(new.raw_user_meta_data->>'full_name', 40), ''), split_part(new.email, '@', 1)),
    case when lower(new.raw_user_meta_data->>'username') ~ '^[a-z0-9_]{3,20}$'
         then lower(new.raw_user_meta_data->>'username') end,
    nullif(left(new.raw_user_meta_data->>'code_name', 24), ''),
    new.raw_user_meta_data->>'course',
    case when (new.raw_user_meta_data->>'year_level') ~ '^[1-4]$'
         then (new.raw_user_meta_data->>'year_level')::int end
  );
  return new;
end $$;

create or replace function public.username_available(u text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(u))
$$;
grant execute on function public.username_available(text) to anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.my_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Only admins may change role, suspended or email.
-- (auth.uid() is null in the SQL editor, so you can still promote an admin there.)
create function public.guard_profile_update() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null
     and (new.role <> old.role or new.suspended <> old.suspended or new.email <> old.email)
     and coalesce(public.my_role()::text, '') <> 'admin' then
    raise exception 'Not allowed to change role, status or email';
  end if;
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_guard
before update on public.profiles
for each row execute function public.guard_profile_update();

alter table public.profiles enable row level security;
create policy "read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "staff read all"     on public.profiles for select using (public.my_role() in ('moderator', 'admin'));
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "admin update any"   on public.profiles for update using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
