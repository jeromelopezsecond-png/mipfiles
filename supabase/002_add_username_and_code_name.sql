-- Run this ONLY if you already ran an older setup.sql (adds username and code name).
alter table public.profiles add column if not exists username text check (username ~ '^[a-z0-9_]{3,20}$');
alter table public.profiles add column if not exists code_name text check (char_length(code_name) <= 24);
create unique index if not exists profiles_username_key on public.profiles (lower(username));

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
