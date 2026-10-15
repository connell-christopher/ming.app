-- Tweaklr Spaces Signature Tools persistence.
-- Run once in Supabase SQL Editor after supabase_spaces_migration.sql.
create table if not exists public.ming_space_dna_state (
  space_id uuid not null references public.ming_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (space_id, user_id),
  constraint ming_space_dna_state_object check (jsonb_typeof(state) = 'object')
);

alter table public.ming_space_dna_state enable row level security;
revoke all on public.ming_space_dna_state from anon, authenticated;
-- All access goes through the membership-checking security-definer RPCs.

create or replace function public.get_ming_space_dna_state(p_space_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_state jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.ming_space_members m
    where m.space_id = p_space_id and m.user_id = v_user and m.approved = true
  ) then raise exception 'Approved Space membership required'; end if;
  select s.state into v_state
  from public.ming_space_dna_state s
  where s.space_id = p_space_id and s.user_id = v_user;
  return coalesce(v_state, '{}'::jsonb);
end;
$$;

create or replace function public.save_ming_space_dna_state(p_space_id uuid, p_state jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_state jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_state) <> 'object' then raise exception 'State must be a JSON object'; end if;
  if octet_length(p_state::text) > 20000 then raise exception 'Space tool state is too large'; end if;
  if not exists (
    select 1 from public.ming_space_members m
    where m.space_id = p_space_id and m.user_id = v_user and m.approved = true
  ) then raise exception 'Approved Space membership required'; end if;
  insert into public.ming_space_dna_state(space_id, user_id, state, updated_at)
  values (p_space_id, v_user, p_state, now())
  on conflict (space_id, user_id)
  do update set state = excluded.state, updated_at = now()
  returning state into v_state;
  return v_state;
end;
$$;

revoke execute on function public.get_ming_space_dna_state(uuid) from public, anon;
revoke execute on function public.save_ming_space_dna_state(uuid, jsonb) from public, anon;
grant execute on function public.get_ming_space_dna_state(uuid) to authenticated;
grant execute on function public.save_ming_space_dna_state(uuid, jsonb) to authenticated;
