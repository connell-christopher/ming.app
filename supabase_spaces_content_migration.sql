-- Tweaklr Spaces content persistence.
-- Run this once in Supabase SQL Editor for the Tweaklr project.
-- This is additive: it does not alter existing Spaces tables or frontend files.

create table if not exists public.ming_space_content (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.ming_spaces(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (char_length(btrim(kind)) between 1 and 40),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ming_space_content_space_created_idx
  on public.ming_space_content (space_id, created_at desc);

create index if not exists ming_space_content_author_idx
  on public.ming_space_content (author_id);

alter table public.ming_space_content enable row level security;
revoke all on table public.ming_space_content from anon, authenticated;

-- Members can load content only for Spaces where their membership is approved.
create or replace function public.get_my_ming_space_content()
returns table (
  id uuid,
  space_id uuid,
  kind text,
  author_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  payload jsonb
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  return query
  select c.id, c.space_id, c.kind, c.author_id, c.created_at, c.updated_at, c.payload
  from public.ming_space_content c
  where exists (
    select 1
    from public.ming_space_members m
    where m.space_id = c.space_id
      and m.user_id = v_user
      and m.approved = true
  )
  order by c.created_at desc;
end;
$$;

-- Create content only as an approved Space member. Announcements in Business
-- Spaces require an owner/admin/manager-level role, matching the UI's pin/post
-- permission. Other content uses the existing minimum posting rank.
create or replace function public.create_ming_space_content(
  p_space_id uuid,
  p_kind text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_space public.ming_spaces;
  v_role text;
  v_rank integer;
  v_row public.ming_space_content;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if p_space_id is null then
    raise exception 'Space is required';
  end if;

  if char_length(btrim(coalesce(p_kind, ''))) not between 1 and 40 then
    raise exception 'Invalid content type';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Content payload must be a JSON object';
  end if;

  select s.* into v_space
  from public.ming_spaces s
  where s.id = p_space_id;

  if not found then
    raise exception 'Space not found';
  end if;

  select m.role into v_role
  from public.ming_space_members m
  where m.space_id = p_space_id
    and m.user_id = v_user
    and m.approved = true;

  if not found then
    raise exception 'Approved Space membership required';
  end if;

  v_rank := case v_role
    when 'owner' then 100
    when 'admin' then 80
    when 'manager' then 60
    when 'moderator' then 60
    when 'seller' then 40
    when 'member' then 30
    when 'buyer' then 30
    when 'guest' then 10
    else 0
  end;

  if v_rank < 30 then
    raise exception 'You cannot post in this Space';
  end if;

  if p_kind = 'announcement' then
    if v_space.nature <> 'business' then
      raise exception 'Announcements are only available in Business Spaces';
    end if;
    if v_rank < 60 then
      raise exception 'Only an owner, admin, or manager can post Business announcements';
    end if;
  end if;

  insert into public.ming_space_content (space_id, author_id, kind, payload)
  values (p_space_id, v_user, btrim(p_kind), p_payload)
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'space_id', v_row.space_id,
    'kind', v_row.kind,
    'author_id', v_row.author_id,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'payload', v_row.payload
  );
end;
$$;

revoke execute on function public.get_my_ming_space_content() from public, anon;
revoke execute on function public.create_ming_space_content(uuid, text, jsonb) from public, anon;

grant execute on function public.get_my_ming_space_content() to authenticated;
grant execute on function public.create_ming_space_content(uuid, text, jsonb) to authenticated;

-- Tell PostgREST to refresh its function/table schema cache.
notify pgrst, 'reload schema';
