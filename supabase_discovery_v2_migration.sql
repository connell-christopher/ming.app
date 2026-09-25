-- Ming Discovery v2: safe location confidence + interest fallback
-- Run this migration in Supabase SQL Editor after the existing discovery schema.
-- It is intentionally additive and does not alter auth, profiles, or connections.

create or replace function public.get_discoverable_profiles(
  p_radius_km double precision default null
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  headline text,
  interests jsonb,
  tags jsonb,
  activity text,
  created_at timestamptz,
  distance_km double precision,
  bearing_deg double precision
)
language sql
security definer
set search_path = public
as $$
  with recent_devices as (
    select distinct on (pdl.user_id)
      pdl.user_id,
      pdl.latitude,
      pdl.longitude,
      pdl.accuracy_m,
      pdl.updated_at
    from public.profile_device_locations pdl
    where pdl.updated_at >= now() - interval '10 minutes'
    order by pdl.user_id, pdl.updated_at desc, pdl.accuracy_m asc
  ),
  me as (
    select rd.latitude, rd.longitude, rd.accuracy_m
    from recent_devices rd
    where rd.user_id = auth.uid()
    limit 1
  ),
  calculated as (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.bio,
      p.headline,
      coalesce(to_jsonb(p.interests), '[]'::jsonb) as interests,
      coalesce(to_jsonb(p.tags), '[]'::jsonb) as tags,
      p.activity,
      p.created_at,
      case
        when me.latitude is null
          or me.accuracy_m > 5000
          or rd.latitude is null
          or rd.accuracy_m > 5000
        then null
        else 6371 * 2 * asin(
          least(1, sqrt(
            power(sin(radians(rd.latitude - me.latitude) / 2), 2)
            + cos(radians(me.latitude))
            * cos(radians(rd.latitude))
            * power(sin(radians(rd.longitude - me.longitude) / 2), 2)
          ))
        )
      end as distance_km,
      case
        when me.latitude is null
          or me.accuracy_m > 5000
          or rd.latitude is null
          or rd.accuracy_m > 5000
        then null
        else mod(
          degrees(atan2(
            sin(radians(rd.longitude - me.longitude)) * cos(radians(rd.latitude)),
            cos(radians(me.latitude)) * sin(radians(rd.latitude))
              - sin(radians(me.latitude)) * cos(radians(rd.latitude))
              * cos(radians(rd.longitude - me.longitude))
          )) + 360,
          360
        )
      end as bearing_deg
    from public.profiles p
    left join recent_devices rd on rd.user_id = p.id
    left join me on true
    where p.id <> auth.uid()
      and coalesce(p.discoverable, true) = true
  )
  select *
  from calculated
  where p_radius_km is null
     or distance_km is null
     or distance_km <= greatest(0, p_radius_km)
  order by
    case when distance_km is null then 1 else 0 end,
    distance_km nulls last,
    lower(coalesce(display_name, username));
$$;

revoke all on function public.get_discoverable_profiles(double precision) from public, anon;
grant execute on function public.get_discoverable_profiles(double precision) to authenticated;

-- Interest fallback. This returns discoverable profiles even when location is
-- disabled or too inaccurate. Matching is based on overlap with the caller's
-- interests/tags; it never invents a geographic distance.
create or replace function public.get_interest_discoverable_profiles(
  p_limit integer default 50
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  headline text,
  interests jsonb,
  tags jsonb,
  activity text,
  created_at timestamptz,
  match_score integer
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select
      coalesce(interests, '[]'::jsonb) as interests,
      coalesce(tags, '[]'::jsonb) as tags
    from public.profiles
    where id = auth.uid()
  ),
  candidates as (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.bio,
      p.headline,
      coalesce(to_jsonb(p.interests), '[]'::jsonb) as interests,
      coalesce(to_jsonb(p.tags), '[]'::jsonb) as tags,
      p.activity,
      p.created_at,
      (
        select count(*)::integer
        from jsonb_array_elements_text(coalesce(p.interests, '[]'::jsonb)) candidate_interest
        where candidate_interest.value in (
          select value from jsonb_array_elements_text(me.interests)
        )
      )
      +
      (
        select count(*)::integer
        from jsonb_array_elements_text(coalesce(p.tags, '[]'::jsonb)) candidate_tag
        where candidate_tag.value in (
          select value from jsonb_array_elements_text(me.tags)
        )
      ) as match_score
    from public.profiles p
    cross join me
    where p.id <> auth.uid()
      and coalesce(p.discoverable, true) = true
  )
  select *
  from candidates
  order by match_score desc, lower(coalesce(display_name, username))
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_interest_discoverable_profiles(integer) from public, anon;
grant execute on function public.get_interest_discoverable_profiles(integer) to authenticated;
