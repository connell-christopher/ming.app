-- Tweaklr Romantic Space hardening and sealed love letters.
-- Apply this migration in the Supabase SQL Editor for the Tweaklr project.
-- This is additive and scoped only to Romantic Spaces and love_letter content.

create or replace function public.ming_enforce_romantic_space_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.nature = 'romantic' then
    new.privacy := 'private';
    new.discoverable := false;
    new.require_approval := true;
    new.max_members := 2;
    new.location_linked := false;
  end if;
  return new;
end;
$function$;

drop trigger if exists ming_enforce_romantic_space_rules on public.ming_spaces;
create trigger ming_enforce_romantic_space_rules
before insert or update on public.ming_spaces
for each row execute function public.ming_enforce_romantic_space_rules();

-- Normalize any existing Romantic Spaces to the same private defaults.
update public.ming_spaces
set privacy = 'private',
    discoverable = false,
    require_approval = true,
    max_members = 2,
    location_linked = false
where nature = 'romantic';

create or replace function public.ming_limit_romantic_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_nature text;
  v_count integer;
begin
  select s.nature
    into v_nature
  from public.ming_spaces as s
  where s.id = new.space_id
  for update;

  if v_nature = 'romantic' then
    -- Locking the Space row serializes concurrent membership inserts so two
    -- simultaneous invitations cannot both claim the final slot.
    select count(*)::integer
      into v_count
    from public.ming_space_members as m
    where m.space_id = new.space_id
      and m.user_id <> new.user_id;

    if v_count >= 2 then
      raise exception 'Romantic Spaces are limited to two people.';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists ming_limit_romantic_members on public.ming_space_members;
create trigger ming_limit_romantic_members
before insert or update of space_id, user_id on public.ming_space_members
for each row execute function public.ming_limit_romantic_members();

-- Love letters are immutable after creation, including attempts through the
-- generic content-update RPC. Other Space content is unaffected.
create or replace function public.ming_seal_romantic_love_letters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.kind = 'love_letter' then
    raise exception 'Love letters are sealed and cannot be edited.';
  end if;
  return new;
end;
$function$;

drop trigger if exists ming_seal_romantic_love_letters on public.ming_space_content;
create trigger ming_seal_romantic_love_letters
before update on public.ming_space_content
for each row execute function public.ming_seal_romantic_love_letters();

revoke all on function public.ming_enforce_romantic_space_rules() from public, anon;
revoke all on function public.ming_limit_romantic_members() from public, anon;
revoke all on function public.ming_seal_romantic_love_letters() from public, anon;

notify pgrst, 'reload schema';
