/*
  Ming search + identity security
  --------------------------------
  1. Makes usernames globally unique, case-insensitively.
  2. Adds a global RPC for discoverable Spaces so Search does not depend
     on the current user's joined Spaces.
  3. Does NOT store or compare passwords. Supabase Auth owns password
     verification and password storage.
*/

-- Usernames are account identifiers and must be unique.
-- If this fails, inspect existing duplicate usernames before rerunning.
create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(btrim(username)))
  where username is not null and btrim(username) <> '';

create or replace function public.get_discoverable_ming_spaces()
returns table (
  id uuid,
  name text,
  description text,
  nature text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.name,
    s.description,
    s.nature,
    s.expires_at
  from public.ming_spaces s
  where s.discoverable = true
    and (s.expires_at is null or s.expires_at > now())
  order by s.created_at desc
  limit 100;
$$;

revoke execute on function public.get_discoverable_ming_spaces() from public, anon;
grant execute on function public.get_discoverable_ming_spaces() to authenticated;

/*
  Password policy:
  ----------------
  Passwords must remain private. Ming must never store plaintext passwords,
  password hashes in the profiles table, or a cross-user password list.

  Two users having the same password is not an identity collision and should
  not be detected by the application. Supabase Auth stores/verifies passwords
  in its authentication system.

  Account identifiers that should be unique are enforced separately:
    - username: this migration
    - email: Supabase Auth's account identity layer
    - future phone/external identifiers: add a database UNIQUE constraint
      only if that field is intentionally defined as a unique account
      identifier.
*/
