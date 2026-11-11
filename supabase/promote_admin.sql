-- EASIEST way to get an admin (most reliable):
-- 1) Register normally on your website with the email you want as admin.
-- 2) Put that same email below (twice) and run this in the SQL Editor.
-- 3) Sign out and sign in again on the site.

update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) = lower('admin@mipmip.com');

update public.profiles set role = 'admin'
where lower(email) = lower('admin@mipmip.com');

-- Check: should show role = admin
select email, role, suspended from public.profiles where lower(email) = lower('admin@mipmip.com');
