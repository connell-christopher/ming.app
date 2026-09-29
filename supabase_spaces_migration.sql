-- Ming Spaces persistence
-- Run this migration in Supabase SQL Editor before using the database-backed Spaces flow.

create table if not exists public.ming_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text not null default '',
  nature text not null check (nature in ('business','friendly','casual','silly','romantic','marketplace')),
  privacy text not null default 'private' check (privacy in ('private','approval','discoverable')),
  discoverable boolean not null default false,
  require_approval boolean not null default false,
  max_members integer check (max_members is null or max_members > 0),
  hue integer,
  location_linked boolean not null default false,
  expires_at timestamptz,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ming_space_members (
  space_id uuid not null references public.ming_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  joined_at timestamptz not null default now(),
  approved boolean not null default true,
  primary key (space_id, user_id)
);

create table if not exists public.ming_space_invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.ming_spaces(id) on delete cascade,
  code_hash text not null unique,
  hint text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer,
  uses integer not null default 0,
  revoked boolean not null default false,
  version integer not null default 1
);

create index if not exists ming_space_members_user_idx
  on public.ming_space_members(user_id);
create index if not exists ming_space_members_space_idx
  on public.ming_space_members(space_id);
create index if not exists ming_spaces_owner_idx
  on public.ming_spaces(owner_id);
create index if not exists ming_space_invites_space_idx
  on public.ming_space_invites(space_id);

alter table public.ming_spaces enable row level security;
alter table public.ming_space_members enable row level security;
alter table public.ming_space_invites enable row level security;

revoke all on table public.ming_spaces, public.ming_space_members, public.ming_space_invites from anon;
grant select, insert, update, delete on table public.ming_spaces, public.ming_space_members, public.ming_space_invites to authenticated;

drop policy if exists "space owner access" on public.ming_spaces;
create policy "space owner access"
on public.ming_spaces
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "own membership access" on public.ming_space_members;
create policy "own membership access"
on public.ming_space_members
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "own invite access" on public.ming_space_invites;
create policy "own invite access"
on public.ming_space_invites
for all
to authenticated
using (
  exists (
    select 1 from public.ming_spaces s
    where s.id = ming_space_invites.space_id
      and s.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.ming_spaces s
    where s.id = ming_space_invites.space_id
      and s.owner_id = (select auth.uid())
  )
);

create or replace function public.get_my_ming_spaces()
returns table (
  space_id uuid,
  owner_id uuid,
  name text,
  description text,
  nature text,
  privacy text,
  discoverable boolean,
  require_approval boolean,
  max_members integer,
  hue integer,
  location_linked boolean,
  expires_at timestamptz,
  features jsonb,
  created_at timestamptz,
  member_id uuid,
  member_role text,
  member_joined_at timestamptz,
  member_approved boolean,
  invite_id uuid,
  invite_code_hash text,
  invite_hint text,
  invite_created_at timestamptz,
  invite_expires_at timestamptz,
  invite_max_uses integer,
  invite_uses integer,
  invite_revoked boolean,
  invite_version integer
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.id,
    s.owner_id,
    s.name,
    s.description,
    s.nature,
    s.privacy,
    s.discoverable,
    s.require_approval,
    s.max_members,
    s.hue,
    s.location_linked,
    s.expires_at,
    s.features,
    s.created_at,
    m.user_id,
    m.role,
    m.joined_at,
    m.approved,
    i.id,
    i.code_hash,
    i.hint,
    i.created_at,
    i.expires_at,
    i.max_uses,
    i.uses,
    i.revoked,
    i.version
  from public.ming_spaces s
  join public.ming_space_members m
    on m.space_id = s.id
  left join lateral (
    select *
    from public.ming_space_invites si
    where si.space_id = s.id
      and si.revoked = false
    order by si.version desc
    limit 1
  ) i on true
  where m.user_id = (select auth.uid())
  order by s.created_at desc, m.joined_at asc;
$$;

create or replace function public.create_ming_space(
  p_name text,
  p_description text default '',
  p_nature text default 'friendly',
  p_privacy text default 'private',
  p_require_approval boolean default false,
  p_max_members integer default null,
  p_hue integer default null,
  p_location_linked boolean default false,
  p_expires_at timestamptz default null,
  p_features jsonb default '{}'::jsonb,
  p_invite_ttl_hours integer default 24,
  p_invite_max_uses integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_space public.ming_spaces;
  v_member public.ming_space_members;
  v_code text;
  v_hash text;
  v_invite public.ming_space_invites;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if char_length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'A Space needs a name.';
  end if;

  if p_nature not in ('business','friendly','casual','silly','romantic','marketplace') then
    raise exception 'Unknown Space nature.';
  end if;

  if p_privacy not in ('private','approval','discoverable') then
    raise exception 'Unknown Space privacy.';
  end if;

  if p_max_members is not null and p_max_members <= 0 then
    raise exception 'Member limit must be positive.';
  end if;

  insert into public.ming_spaces (
    owner_id, name, description, nature, privacy, discoverable,
    require_approval, max_members, hue, location_linked, expires_at, features
  )
  values (
    v_user,
    btrim(p_name),
    coalesce(p_description, ''),
    p_nature,
    case when p_nature = 'romantic' then 'private' else p_privacy end,
    case when p_nature = 'romantic' then false else p_privacy = 'discoverable' end,
    (p_privacy = 'approval' or p_require_approval),
    p_max_members,
    p_hue,
    p_location_linked,
    p_expires_at,
    coalesce(p_features, '{}'::jsonb)
  )
  returning * into v_space;

  insert into public.ming_space_members (space_id, user_id, role, approved)
  values (
    v_space.id,
    v_user,
    case when p_nature = 'marketplace' then 'owner' else 'owner' end,
    true
  )
  returning * into v_member;

  v_code := upper(
    substr(md5(random()::text || clock_timestamp()::text || v_user::text), 1, 4)
    || '-' ||
    substr(md5(random()::text || clock_timestamp()::text || v_space.id::text), 1, 4)
  );
  v_hash := encode(digest(v_code, 'sha256'), 'hex');

  insert into public.ming_space_invites (
    space_id, code_hash, hint, expires_at, max_uses, version
  )
  values (
    v_space.id,
    v_hash,
    right(v_code, 2),
    case when coalesce(p_invite_ttl_hours, 24) > 0
      then now() + make_interval(hours => coalesce(p_invite_ttl_hours, 24))
      else null end,
    p_invite_max_uses,
    1
  )
  returning * into v_invite;

  return jsonb_build_object(
    'space', jsonb_build_object(
      'id', v_space.id,
      'name', v_space.name,
      'description', v_space.description,
      'nature', v_space.nature,
      'privacy', v_space.privacy,
      'discoverable', v_space.discoverable,
      'requireApproval', v_space.require_approval,
      'maxMembers', v_space.max_members,
      'hue', v_space.hue,
      'locationLinked', v_space.location_linked,
      'expiresAt', v_space.expires_at,
      'features', v_space.features,
      'ownerId', v_space.owner_id,
      'createdAt', v_space.created_at
    ),
    'member', jsonb_build_object(
      'spaceId', v_member.space_id,
      'userId', v_member.user_id,
      'role', v_member.role,
      'joinedAt', v_member.joined_at,
      'approved', v_member.approved
    ),
    'invite', jsonb_build_object(
      'id', v_invite.id,
      'codeHash', v_invite.code_hash,
      'hint', v_invite.hint,
      'createdAt', v_invite.created_at,
      'expiresAt', v_invite.expires_at,
      'maxUses', v_invite.max_uses,
      'uses', v_invite.uses,
      'revoked', v_invite.revoked,
      'version', v_invite.version
    ),
    'code', v_code
  );
end;
$$;

create or replace function public.redeem_ming_space_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_hash text;
  v_invite public.ming_space_invites;
  v_space public.ming_spaces;
  v_count integer;
  v_role text;
  v_approved boolean;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if btrim(coalesce(p_code, '')) = '' then raise exception 'Invitation code required'; end if;

  v_hash := encode(digest(upper(btrim(p_code)), 'sha256'), 'hex');

  select * into v_invite
  from public.ming_space_invites
  where code_hash = v_hash and revoked = false
  for update;

  if not found then raise exception 'That code is not valid. It may have been regenerated.'; end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then raise exception 'That invitation has expired.'; end if;
  if v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses then raise exception 'That invitation has reached its maximum uses.'; end if;

  select * into v_space from public.ming_spaces where id = v_invite.space_id;
  if not found then raise exception 'Space not found.'; end if;

  if exists (
    select 1 from public.ming_space_members
    where space_id = v_space.id and user_id = v_user
  ) then
    raise exception 'You are already in this Space.';
  end if;

  select count(*) into v_count from public.ming_space_members where space_id = v_space.id;
  if v_space.max_members is not null and v_count >= v_space.max_members then raise exception 'This Space is full.'; end if;

  v_role := case when v_space.nature = 'marketplace' then 'buyer' else 'member' end;
  v_approved := not v_space.require_approval;

  insert into public.ming_space_members (space_id, user_id, role, approved)
  values (v_space.id, v_user, v_role, v_approved);

  update public.ming_space_invites
  set uses = uses + 1
  where id = v_invite.id;

  return jsonb_build_object(
    'id', v_space.id,
    'name', v_space.name,
    'description', v_space.description,
    'nature', v_space.nature,
    'privacy', v_space.privacy,
    'discoverable', v_space.discoverable,
    'requireApproval', v_space.require_approval,
    'maxMembers', v_space.max_members,
    'hue', v_space.hue,
    'locationLinked', v_space.location_linked,
    'expiresAt', v_space.expires_at,
    'features', v_space.features,
    'ownerId', v_space.owner_id,
    'createdAt', v_space.created_at
  );
end;
$$;

revoke execute on function public.get_my_ming_spaces() from public, anon;
revoke execute on function public.create_ming_space(text,text,text,text,boolean,integer,integer,boolean,timestamptz,jsonb,integer,integer) from public, anon;
revoke execute on function public.redeem_ming_space_invite(text) from public, anon;

grant execute on function public.get_my_ming_spaces() to authenticated;
grant execute on function public.create_ming_space(text,text,text,text,boolean,integer,integer,boolean,timestamptz,jsonb,integer,integer) to authenticated;
grant execute on function public.redeem_ming_space_invite(text) to authenticated;

-- pgcrypto is required for SHA-256 invitation-code hashing.
-- Supabase provides pgcrypto; if this migration reports that digest() is missing,
-- enable pgcrypto in Database > Extensions and rerun the function definitions.
