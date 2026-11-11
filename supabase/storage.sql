-- MIPMIP FILES: private storage bucket for reviewer files (safe to re-run)
-- Run in Supabase: SQL Editor > New query > paste > Run (after setup.sql)
-- Read:   any signed-in, non-suspended user
-- Upload / replace: moderator + admin
-- Delete: admin only

insert into storage.buckets (id, name, public, file_size_limit)
values ('reviewers', 'reviewers', false, 52428800)   -- private, 50 MB per file
on conflict (id) do nothing;

drop policy if exists "signed-in read reviewers" on storage.objects;
drop policy if exists "staff upload reviewers"   on storage.objects;
drop policy if exists "staff update reviewers"   on storage.objects;
drop policy if exists "staff delete reviewers"   on storage.objects;
drop policy if exists "admin delete reviewers"   on storage.objects;

create policy "signed-in read reviewers" on storage.objects for select to authenticated
using (bucket_id = 'reviewers'
       and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended));

create policy "staff upload reviewers" on storage.objects for insert to authenticated
with check (bucket_id = 'reviewers' and public.my_role() in ('moderator','admin'));

create policy "staff update reviewers" on storage.objects for update to authenticated
using (bucket_id = 'reviewers' and public.my_role() in ('moderator','admin'));

create policy "admin delete reviewers" on storage.objects for delete to authenticated
using (bucket_id = 'reviewers' and public.my_role() = 'admin');
