-- Ming GPS / Nearby hardening
-- Run this in Supabase SQL Editor after the existing discovery SQL.
-- This keeps separate location records per signed-in device so a phone
-- cannot overwrite a laptop's location.

create extension if not exists pgcrypto;

create table if not exists public.profile_device_locations (
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision not null check (accuracy_m >= 0 and accuracy_m <= 500),
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

create index if not exists profile_device_locations_user_updated_idx
  on public.profile_device_locations (user_id, updated_at desc);

create index if not exists profile_device_locations_updated_idx
  on public.profile_device_locations (updated_at desc);

alter table public.profile_device_locations enable row level security;

revoke all on table public.profile_device_locations from anon;
grant select, insert, update, delete on table public.profile_device_locations to authenticated;

drop policy if exists "Users can manage their own device locations"
on public.profile_device_locations;

create policy "Users can manage their own device locations"
on public.profile_device_locations
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Publish only verified device fixes. The browser must send a stable device ID.
-- Coordinates are rounded server-side to roughly 100m for privacy.
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

  if p_accuracy_m is null or p_accuracy_m > 100 then
    raise exception 'Location accuracy is not sufficient for Nearby';
  end if;

  insert into public.profile_device_locations (
    user_id,
    device_id,
    latitude,
    longitude,
    accuracy_m,
    updated_at
  )
  values (
    v_uid,
    v_device,
    round(p_latitude::numeric, 3)::double precision,
    round(p_longitude::numeric, 3)::double precision,
    greatest(0, p_accuracy_m),
    now()
  )
  on conflict (user_id, device_id)
  do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_m = excluded.accuracy_m,
    updated_at = excluded.updated_at;

  -- Keep abandoned device records from accumulating forever.
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

-- Return one fresh, verified device location per discoverable profile.
-- If the current user has no location, distance/bearing remain NULL rather
-- than inventing a location from IP or another source.
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
  with fresh_devices as (
    select distinct on (pdl.user_id)
      pdl.user_id,
      pdl.latitude,
      pdl.longitude,
      pdl.accuracy_m,
      pdl.updated_at
    from public.profile_device_locations pdl
    where pdl.updated_at >= now() - interval '10 minutes'
      and pdl.accuracy_m <= 100
    order by pdl.user_id, pdl.updated_at desc, pdl.accuracy_m asc
  ),
  me as (
    select fd.latitude, fd.longitude
    from fresh_devices fd
    where fd.user_id = auth.uid()
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
        when me.latitude is null then null
        else
          6371 * 2 * asin(
            sqrt(
              power(sin(radians(fd.latitude - me.latitude) / 2), 2)
              + cos(radians(me.latitude))
              * cos(radians(fd.latitude))
              * power(sin(radians(fd.longitude - me.longitude) / 2), 2)
            )
          )
      end as distance_km,
      case
        when me.latitude is null then null
        else
          case
            when degrees(
              atan2(
                sin(radians(fd.longitude - me.longitude)) * cos(radians(fd.latitude)),
                cos(radians(me.latitude)) * sin(radians(fd.latitude))
                - sin(radians(me.latitude)) * cos(radians(fd.latitude))
                * cos(radians(fd.longitude - me.longitude))
              )
            ) < 0 then degrees(
              atan2(
                sin(radians(fd.longitude - me.longitude)) * cos(radians(fd.latitude)),
                cos(radians(me.latitude)) * sin(radians(fd.latitude))
                - sin(radians(me.latitude)) * cos(radians(fd.latitude))
                * cos(radians(fd.longitude - me.longitude))
              )
            ) + 360
            when degrees(
              atan2(
                sin(radians(fd.longitude - me.longitude)) * cos(radians(fd.latitude)),
                cos(radians(me.latitude)) * sin(radians(fd.latitude))
                - sin(radians(me.latitude)) * cos(radians(fd.latitude))
                * cos(radians(fd.longitude - me.longitude))
              )
            ) >= 360 then degrees(
              atan2(
                sin(radians(fd.longitude - me.longitude)) * cos(radians(fd.latitude)),
                cos(radians(me.latitude)) * sin(radians(fd.latitude))
                - sin(radians(me.latitude)) * cos(radians(fd.latitude))
                * cos(radians(fd.longitude - me.longitude))
              )
            ) - 360
            else degrees(
              atan2(
                sin(radians(fd.longitude - me.longitude)) * cos(radians(fd.latitude)),
                cos(radians(me.latitude)) * sin(radians(fd.latitude))
                - sin(radians(me.latitude)) * cos(radians(fd.latitude))
                * cos(radians(fd.longitude - me.longitude))
              )
            )
          end
      end as bearing_deg
    from public.profiles p
    join fresh_devices fd on fd.user_id = p.id
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
    display_name;
$$;

revoke all on function public.get_discoverable_profiles(double precision)
  from public, anon;

grant execute on function public.get_discoverable_profiles(double precision)
  to authenticated;
