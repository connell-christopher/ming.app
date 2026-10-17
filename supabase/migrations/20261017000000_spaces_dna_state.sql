-- Tweaklr Spaces DNA state persistence
-- Stores each signed-in member's private tool state separately for each Space.
-- This migration is safe to re-run. Space IDs are stored as text to match the
-- existing frontend's dataset.spaceId value without assuming the source column type.

create table if not exists public.ming_space_dna_states (
  space_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint ming_space_dna_states_space_user_key unique (space_id, user_id),
  constraint ming_space_dna_states_state_object check (jsonb_typeof(state) = 'object')
);

alter table public.ming_space_dna_states enable row level security;

drop policy if exists "Members manage their own Spaces DNA state"
  on public.ming_space_dna_states;

create policy "Members manage their own Spaces DNA state"
  on public.ming_space_dna_states
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.save_ming_space_dna_state(
  p_space_id text,
  p_state jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_space_id is null or length(trim(p_space_id)) = 0 then
    raise exception 'Space ID is required';
  end if;

  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'Space DNA state must be a JSON object';
  end if;

  insert into public.ming_space_dna_states (space_id, user_id, state, updated_at)
  values (p_space_id, auth.uid(), p_state, now())
  on conflict (space_id, user_id)
  do update set state = excluded.state, updated_at = now();
end;
$function$;

create or replace function public.get_ming_space_dna_state(
  p_space_id text
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select s.state
  from public.ming_space_dna_states as s
  where s.space_id = p_space_id
    and s.user_id = auth.uid()
  limit 1;
$function$;

revoke all on function public.save_ming_space_dna_state(text, jsonb) from public, anon;
revoke all on function public.get_ming_space_dna_state(text) from public, anon;
grant execute on function public.save_ming_space_dna_state(text, jsonb) to authenticated;
grant execute on function public.get_ming_space_dna_state(text) to authenticated;

grant select, insert, update, delete on public.ming_space_dna_states to authenticated;
