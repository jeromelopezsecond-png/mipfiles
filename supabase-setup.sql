-- MIPMIP FILES: accounts, roles, and Row Level Security
-- Run this once in Supabase: SQL Editor > New query > paste > Run

create type public.app_role as enum ('student', 'moderator', 'admin');

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null check (char_length(full_name) <= 40),
  course      text,
  year_level  int check (year_level between 1 and 4),
  section     text check (char_length(section) <= 20),
  role        public.app_role not null default 'student',
  suspended   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

-- Create a profile automatically when someone signs up.
-- The role is ALWAYS 'student' here; the client can never choose it.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, course, year_level, section)
  values (
    new.id,
    new.email,
    coalesce(nullif(left(new.raw_user_meta_data->>'full_name', 40), ''), split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'course',
    case when (new.raw_user_meta_data->>'year_level') ~ '^[1-4]$'
         then (new.raw_user_meta_data->>'year_level')::int end,
    left(new.raw_user_meta_data->>'section', 20)
  );
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Helper used by policies (security definer avoids recursive RLS).
create function public.my_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Block privilege escalation: only admins can change role, suspended or email.
-- (auth.uid() is null in the SQL editor, so you can still promote your first admin there.)
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

-- Row Level Security
alter table public.profiles enable row level security;

create policy "read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "staff read all"     on public.profiles for select using (public.my_role() in ('moderator', 'admin'));
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "admin update any"   on public.profiles for update using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
-- No insert or delete policies: profiles are created by the trigger and removed with the auth user.

-- After you sign up with your own account, make yourself the first admin:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
