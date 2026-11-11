-- Create (or promote) the admin account.
-- 1) Edit the three values below. 2) Run in SQL Editor. 3) Sign in on the site with that email and password.
-- If the email already signed up on the site, this just promotes it to admin.
do $$
declare
  v_email    text := 'admin@mipmip.com';
  v_password text := 'Saranghae0@';
  v_name     text := 'Site Admin';
  v_username text := 'admin';
  v_code     text := 'Head Archivist';
  uid uuid;
  c text;
begin
  if v_email like 'CHANGE_ME%' or v_password like 'CHANGE_ME%' then
    raise exception 'Edit v_email and v_password first';
  end if;
  select id into uid from auth.users where email = lower(v_email);
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', lower(v_email),
      crypt(v_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', v_name, 'username', v_username, 'code_name', v_code),
      now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', lower(v_email)),
      'email', now(), now(), now());
    -- Newer Supabase versions fail login ("Database error querying schema") if these are NULL.
    foreach c in array array['email_change_token_current','phone_change','phone_change_token','reauthentication_token'] loop
      begin
        execute format('update auth.users set %I = coalesce(%I, '''') where id = $1', c, c) using uid;
      exception when undefined_column then null;
      end;
    end loop;
  end if;
  update public.profiles set role = 'admin' where id = uid;
  if not found then
    raise exception 'No profile row for this user. Run setup.sql first, then run this script again.';
  end if;
end $$;
