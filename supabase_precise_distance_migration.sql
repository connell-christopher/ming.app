-- Ming precise distance migration
-- Run this after the existing Discovery v2 migration.
-- Stores the device-provided coordinates at full browser precision so
-- Nearby can calculate metres/km instead of using ~100m rounded points.

create or replace function public.set_my_discovery_location(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision,
  p_device_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_device text := left(trim(coalesce(p_device_id, '')), 128);
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_device = '' then
    raise exception 'Device identifier is required';
  end if;

  if p_latitude is null or p_longitude is null
     or p_latitude < -90 or p_latitude > 90
     or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid coordinates';
  end if;

  if p_accuracy_m is null or p_accuracy_m < 0 or p_accuracy_m > 50000 then
    raise exception 'Invalid location accuracy';
  end if;

  insert into public.profile_device_locations (
    user_id, device_id, latitude, longitude, accuracy_m, updated_at
  )
  values (
    v_uid,
    v_device,
    p_latitude,
    p_longitude,
    p_accuracy_m,
    now()
  )
  on conflict (user_id, device_id)
  do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_m = excluded.accuracy_m,
    updated_at = excluded.updated_at;

  delete from public.profile_device_locations
  where user_id = v_uid
    and updated_at < now() - interval '7 days';
end;
$$;

revoke all on function public.set_my_discovery_location(
  double precision, double precision, double precision, text
) from public, anon;

grant execute on function public.set_my_discovery_location(
  double precision, double precision, double precision, text
) to authenticated;

-- Compatibility overload used by the current Ming browser frontend.
create or replace function public.set_my_discovery_location(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.set_my_discovery_location(
    p_latitude,
    p_longitude,
    p_accuracy_m,
    'browser'
  );
end;
$$;

revoke all on function public.set_my_discovery_location(
  double precision, double precision, double precision
) from public, anon;

grant execute on function public.set_my_discovery_location(
  double precision, double precision, double precision
) to authenticated;

-- Return exact calculated proximity from the latest fresh coordinates.
-- Coordinates themselves are never returned to the frontend.
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
    select latitude, longitude, accuracy_m
    from recent_devices
    where user_id = auth.uid()
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
          or me.longitude is null
          or me.accuracy_m > 5000
          or rd.latitude is null
          or rd.longitude is null
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
          or me.longitude is null
          or me.accuracy_m > 5000
          or rd.latitude is null
          or rd.longitude is null
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
