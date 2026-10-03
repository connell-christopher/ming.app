-- Ming post media: photos and videos for all Daily Update composer types.
-- Run this once in the Supabase SQL Editor.

alter table public.daily_updates
  add column if not exists media jsonb not null default '[]'::jsonb;

create index if not exists daily_updates_media_gin_idx
on public.daily_updates using gin (media);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ming-post-media',
  'ming-post-media',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v'
  ]
)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload Ming post media" on storage.objects;
create policy "Authenticated users can upload Ming post media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ming-post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Authenticated users can view Ming post media" on storage.objects;
create policy "Authenticated users can view Ming post media"
on storage.objects
for select
to authenticated
using (bucket_id = 'ming-post-media');

drop policy if exists "Users can delete their own Ming post media" on storage.objects;
create policy "Users can delete their own Ming post media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ming-post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.get_daily_updates(
  p_limit integer default 50
)
returns table (
  id uuid,
  author_id uuid,
  kind text,
  title text,
  body text,
  media jsonb,
  created_at timestamptz,
  likes integer,
  liked boolean,
  comments_count integer,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  author_bio text,
  author_headline text,
  author_activity text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    u.id,
    u.author_id,
    u.kind,
    u.title,
    u.body,
    coalesce(u.media, '[]'::jsonb) as media,
    u.created_at,
    (
      select count(*)::integer
      from public.daily_update_likes l
      where l.update_id = u.id
    ) as likes,
    exists (
      select 1
      from public.daily_update_likes l
      where l.update_id = u.id
        and l.user_id = auth.uid()
    ) as liked,
    (
      select count(*)::integer
      from public.daily_update_comments c
      where c.update_id = u.id
    ) as comments_count,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.headline,
    p.activity
  from public.daily_updates u
  join public.profiles p on p.id = u.author_id
  where u.created_at > now() - interval '24 hours'
  order by u.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_daily_updates(integer) from public, anon;
grant execute on function public.get_daily_updates(integer) to authenticated;
