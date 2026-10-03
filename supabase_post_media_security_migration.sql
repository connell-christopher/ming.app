-- Ming post media security hardening.
-- Run this once in the Supabase SQL Editor after supabase_post_media_migration.sql.

-- Media files are uploaded with unique paths and upsert=false.
-- Keep the bucket private and allow object updates only to the owner.
drop policy if exists "Users can update their own Ming post media" on storage.objects;
create policy "Users can update their own Ming post media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ming-post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'ming-post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Prevent a user from attaching another user's storage object to a post.
create or replace function public.validate_daily_update_media_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  media_path text;
begin
  if new.media is null or jsonb_typeof(new.media) <> 'array' then
    raise exception 'Daily Update media must be a JSON array';
  end if;

  for item in select value from jsonb_array_elements(new.media)
  loop
    media_path := item->>'path';

    if media_path is null or media_path = '' then
      raise exception 'Daily Update media item is missing a path';
    end if;

    if split_part(media_path, '/', 1) <> new.author_id::text then
      raise exception 'Daily Update media must belong to the post author';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists validate_daily_update_media_owner on public.daily_updates;
create trigger validate_daily_update_media_owner
before insert or update of media, author_id
on public.daily_updates
for each row
execute function public.validate_daily_update_media_owner();

revoke all on function public.validate_daily_update_media_owner() from public, anon;
grant execute on function public.validate_daily_update_media_owner() to authenticated;
