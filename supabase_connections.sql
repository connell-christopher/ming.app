-- Ming connections
-- Run this once in Supabase SQL Editor.

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  note text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint connections_no_self check (requester_id <> recipient_id)
);

create unique index if not exists connections_pending_pair_idx
on public.connections (
  least(requester_id, recipient_id),
  greatest(requester_id, recipient_id)
)
where status = 'pending';

create index if not exists connections_requester_idx
on public.connections(requester_id);

create index if not exists connections_recipient_idx
on public.connections(recipient_id);

alter table public.connections enable row level security;

revoke all on table public.connections from anon;
grant select, insert, update, delete on public.connections to authenticated;

drop policy if exists "Users can view their connection rows" on public.connections;
create policy "Users can view their connection rows"
on public.connections
for select
to authenticated
using (
  (select auth.uid()) = requester_id
  or (select auth.uid()) = recipient_id
);

drop policy if exists "Users can send connection requests" on public.connections;
create policy "Users can send connection requests"
on public.connections
for insert
to authenticated
with check (
  (select auth.uid()) = requester_id
  and requester_id <> recipient_id
  and status = 'pending'
);

drop policy if exists "Recipients can respond to connection requests" on public.connections;
create policy "Recipients can respond to connection requests"
on public.connections
for update
to authenticated
using (
  (select auth.uid()) = recipient_id
  and status = 'pending'
)
with check (
  (select auth.uid()) = recipient_id
  and status in ('accepted', 'declined')
);

drop policy if exists "Connected users can remove a connection" on public.connections;
create policy "Connected users can remove a connection"
on public.connections
for delete
to authenticated
using (
  ((select auth.uid()) = requester_id or (select auth.uid()) = recipient_id)
  and status = 'accepted'
);

-- Return only limited profile fields for people connected to the signed-in user.
-- This avoids weakening the main profiles RLS policy just to render Connections.
create or replace function public.get_my_connection_profiles()
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
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.headline,
    to_jsonb(p.interests),
    to_jsonb(p.tags),
    p.activity,
    p.created_at
  from public.profiles p
  where p.id in (
    select case
      when c.requester_id = (select auth.uid()) then c.recipient_id
      else c.requester_id
    end
    from public.connections c
    where
      (c.requester_id = (select auth.uid()) or c.recipient_id = (select auth.uid()))
      and c.status in ('pending', 'accepted')
  );
$$;

revoke all on function public.get_my_connection_profiles() from public;
grant execute on function public.get_my_connection_profiles() to authenticated;

-- Ming discovery and nearby users
alter table public.profiles add column if not exists discoverable boolean not null default true;

create table if not exists public.profile_locations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  updated_at timestamptz not null default now()
);

alter table public.profile_locations enable row level security;
revoke all on table public.profile_locations from anon, authenticated;
grant select, insert, update, delete on table public.profile_locations to authenticated;
drop policy if exists "Users can manage their own approximate location" on public.profile_locations;
create policy "Users can manage their own approximate location" on public.profile_locations for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.set_my_discovery_location(p_latitude double precision, p_longitude double precision)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Not authenticated'; end if;
  if p_latitude is null or p_latitude < -90 or p_latitude > 90 or p_longitude is null or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid coordinates';
  end if;
  insert into public.profile_locations(user_id, latitude, longitude, updated_at)
  values ((select auth.uid()), round(p_latitude::numeric, 3)::double precision, round(p_longitude::numeric, 3)::double precision, now())
  on conflict (user_id) do update set latitude=excluded.latitude, longitude=excluded.longitude, updated_at=excluded.updated_at;
end; $$;
revoke all on function public.set_my_discovery_location(double precision, double precision) from public;
grant execute on function public.set_my_discovery_location(double precision, double precision) to authenticated;

create or replace function public.get_discoverable_profiles(p_radius_km double precision default null)
returns table (id uuid, username text, display_name text, avatar_url text, bio text, headline text, interests jsonb, tags jsonb, activity text, created_at timestamptz, distance_km double precision, bearing_deg double precision)
language sql security definer set search_path = '' stable as $$
with me as (select latitude, longitude from public.profile_locations where user_id=(select auth.uid())),
candidates as (
  select p.id,p.username,p.display_name,p.avatar_url,p.bio,p.headline,to_jsonb(p.interests) interests,to_jsonb(p.tags) tags,p.activity,p.created_at,l.latitude,l.longitude,me.latitude my_latitude,me.longitude my_longitude
  from public.profiles p left join public.profile_locations l on l.user_id=p.id cross join me
  where p.discoverable=true and p.id<>(select auth.uid())
),
measured as (
  select c.*,
    case when c.latitude is null then null else 6371.0*2.0*asin(sqrt(power(sin(radians(c.latitude-c.my_latitude)/2.0),2)+cos(radians(c.my_latitude))*cos(radians(c.latitude))*power(sin(radians(c.longitude-c.my_longitude)/2.0),2))) end distance_km,
    case when c.latitude is null then null else mod(degrees(atan2(sin(radians(c.longitude-c.my_longitude))*cos(radians(c.latitude)),cos(radians(c.my_latitude))*sin(radians(c.latitude))-sin(radians(c.my_latitude))*cos(radians(c.latitude))*cos(radians(c.longitude-c.my_longitude))))+360.0,360.0) end bearing_deg
  from candidates c
)
select id,username,display_name,avatar_url,bio,headline,interests,tags,activity,created_at,distance_km,bearing_deg
from measured
where p_radius_km is null or distance_km is null or distance_km<=p_radius_km
order by case when distance_km is null then 1 else 0 end, distance_km nulls last, created_at desc limit 100;
$$;
revoke all on function public.get_discoverable_profiles(double precision) from public;
grant execute on function public.get_discoverable_profiles(double precision) to authenticated;