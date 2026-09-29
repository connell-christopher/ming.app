/*
  Ming Nearby activity data
  --------------------------
  Adds real scheduling/location metadata to activity Daily Updates.
  Exact activity coordinates stay server-side; Nearby receives only
  distance/bearing plus public activity details.
*/

alter table public.daily_updates
  add column if not exists activity_starts_at timestamptz,
  add column if not exists activity_place text,
  add column if not exists activity_latitude double precision,
  add column if not exists activity_longitude double precision;

create index if not exists daily_updates_activity_starts_idx
  on public.daily_updates (activity_starts_at)
  where kind = 'activity';

create or replace function public.get_nearby_activities(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_km double precision default 5
)
returns table (
  id uuid,
  author_id uuid,
  author_display_name text,
  author_username text,
  author_avatar_url text,
  author_headline text,
  author_bio text,
  author_activity text,
  title text,
  body text,
  created_at timestamptz,
  starts_at timestamptz,
  place text,
  going bigint,
  distance_km double precision,
  bearing_deg double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as (
    select
      du.id,
      du.author_id,
      p.display_name as author_display_name,
      p.username as author_username,
      p.avatar_url as author_avatar_url,
      p.headline as author_headline,
      p.bio as author_bio,
      p.activity as author_activity,
      du.title,
      du.body,
      du.created_at,
      du.activity_starts_at as starts_at,
      du.activity_place as place,
      (
        select count(*)
        from public.daily_update_participants dup
        where dup.update_id = du.id
      )::bigint as going,
      6371.0088 * 2 * asin(
        sqrt(
          power(sin(radians(du.activity_latitude - p_latitude) / 2), 2) +
          cos(radians(p_latitude)) *
          cos(radians(du.activity_latitude)) *
          power(sin(radians(du.activity_longitude - p_longitude) / 2), 2)
        )
      ) as distance_km,
      degrees(
        atan2(
          sin(radians(du.activity_longitude - p_longitude)) * cos(radians(du.activity_latitude)),
          cos(radians(p_latitude)) * sin(radians(du.activity_latitude)) -
          sin(radians(p_latitude)) * cos(radians(du.activity_latitude)) *
          cos(radians(du.activity_longitude - p_longitude))
        )
      ) as bearing_raw
    from public.daily_updates du
    join public.profiles p on p.id = du.author_id
    where du.kind = 'activity'
      and du.activity_starts_at is not null
      and du.activity_starts_at >= now()
      and du.activity_latitude is not null
      and du.activity_longitude is not null
      and p.discoverable is distinct from false
  )
  select
    c.id,
    c.author_id,
    c.author_display_name,
    c.author_username,
    c.author_avatar_url,
    c.author_headline,
    c.author_bio,
    c.author_activity,
    c.title,
    c.body,
    c.created_at,
    c.starts_at,
    c.place,
    c.going,
    c.distance_km,
    case when c.bearing_raw < 0 then c.bearing_raw + 360 else c.bearing_raw end
  from candidates c
  where c.distance_km <= greatest(0.1, least(coalesce(p_radius_km, 5), 5))
  order by c.starts_at asc, c.distance_km asc
  limit 50;
$$;

revoke execute on function public.get_nearby_activities(double precision, double precision, double precision) from public;
grant execute on function public.get_nearby_activities(double precision, double precision, double precision) to authenticated;
