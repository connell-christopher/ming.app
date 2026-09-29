-- Ming Spaces nature hardening
-- Run after supabase_spaces_migration.sql.
-- Enforces the product rules at the database boundary as well as in the UI.

create or replace function public.ming_validate_space_nature()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.nature = 'romantic' then
    new.privacy := 'private';
    new.discoverable := false;
    new.require_approval := true;
    new.max_members := 2;
  elsif new.nature = 'business' then
    if new.max_members is not null and new.max_members > 100 then
      raise exception 'Business Spaces can have at most 100 members.';
    end if;
  elsif new.nature = 'friendly' then
    if new.max_members is not null and new.max_members > 50 then
      raise exception 'Friendly Spaces can have at most 50 members.';
    end if;
  elsif new.nature = 'casual' then
    if new.max_members is not null and new.max_members > 30 then
      raise exception 'Casual Spaces can have at most 30 members.';
    end if;
    if new.expires_at is null then
      new.expires_at := now() + interval '24 hours';
    elsif new.expires_at > now() + interval '30 days' then
      raise exception 'Casual Spaces can stay open for at most 30 days.';
    end if;
  elsif new.nature = 'silly' then
    if new.max_members is not null and new.max_members > 40 then
      raise exception 'Silly Spaces can have at most 40 members.';
    end if;
  elsif new.nature = 'marketplace' then
    if new.max_members is not null and new.max_members > 100 then
      raise exception 'Marketplace Spaces can have at most 100 members.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ming_validate_space_nature on public.ming_spaces;
create trigger ming_validate_space_nature
before insert or update on public.ming_spaces
for each row execute function public.ming_validate_space_nature();

revoke all on function public.ming_validate_space_nature() from public;
grant execute on function public.ming_validate_space_nature() to authenticated;
