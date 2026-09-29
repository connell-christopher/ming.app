-- Ming Discover: real backend for activities, places and saved places
-- Run this once in the Supabase SQL Editor after supabase_home_migration.sql.

create table if not exists public.daily_update_participants (
  update_id uuid not null references public.daily_updates(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (update_id, user_id)
);

create index if not exists daily_update_participants_update_idx
on public.daily_update_participants(update_id);

create index if not exists daily_update_participants_user_idx
on public.daily_update_participants(user_id, created_at desc);

alter table public.daily_update_participants enable row level security;

revoke all on table public.daily_update_participants from anon;
grant select, insert, delete on table public.daily_update_participants to authenticated;

drop policy if exists "Authenticated users can read activity participants" on public.daily_update_participants;
create policy "Authenticated users can read activity participants"
on public.daily_update_participants
for select
to authenticated
using (true);

drop policy if exists "Users can join activities as themselves" on public.daily_update_participants;
create policy "Users can join activities as themselves"
on public.daily_update_participants
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can leave activities as themselves" on public.daily_update_participants;
create policy "Users can leave activities as themselves"
on public.daily_update_participants
for delete
to authenticated
using ((select auth.uid()) = user_id);


create table if not exists public.discover_places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'Place',
  note text not null default '',
  latitude double precision,
  longitude double precision,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  active boolean not null default true,
  constraint discover_places_coordinates_check
    check (
      (latitude is null and longitude is null)
      or (
        latitude between -90 and 90
        and longitude between -180 and 180
      )
    )
);

create index if not exists discover_places_active_idx
on public.discover_places(active, created_at desc);

alter table public.discover_places enable row level security;

revoke all on table public.discover_places from anon;
grant select, insert, update, delete on table public.discover_places to authenticated;

drop policy if exists "Authenticated users can read active discover places" on public.discover_places;
create policy "Authenticated users can read active discover places"
on public.discover_places
for select
to authenticated
using (active = true or (select auth.uid()) = created_by);

drop policy if exists "Users can create discover places" on public.discover_places;
create policy "Users can create discover places"
on public.discover_places
for insert
to authenticated
with check ((select auth.uid()) = created_by);

drop policy if exists "Users can update their discover places" on public.discover_places;
create policy "Users can update their discover places"
on public.discover_places
for update
to authenticated
using ((select auth.uid()) = created_by)
with check ((select auth.uid()) = created_by);

drop policy if exists "Users can delete their discover places" on public.discover_places;
create policy "Users can delete their discover places"
on public.discover_places
for delete
to authenticated
using ((select auth.uid()) = created_by);


create table if not exists public.saved_discover_places (
  place_id uuid not null references public.discover_places(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (place_id, user_id)
);

create index if not exists saved_discover_places_user_idx
on public.saved_discover_places(user_id, created_at desc);

alter table public.saved_discover_places enable row level security;

revoke all on table public.saved_discover_places from anon;
grant select, insert, delete on table public.saved_discover_places to authenticated;

drop policy if exists "Users can read their saved discover places" on public.saved_discover_places;
create policy "Users can read their saved discover places"
on public.saved_discover_places
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can save places as themselves" on public.saved_discover_places;
create policy "Users can save places as themselves"
on public.saved_discover_places
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can unsave places as themselves" on public.saved_discover_places;
create policy "Users can unsave places as themselves"
on public.saved_discover_places
for delete
to authenticated
using ((select auth.uid()) = user_id);


create or replace function public.get_discover_places(
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_radius_km double precision default 5
)
returns table (
  id uuid,
  name text,
  kind text,
  note text,
  distance_km double precision,
  saved_by_me boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with places as (
    select
      pl.id,
      pl.name,
      pl.kind,
      pl.note,
      case
        when p_latitude is null
          or p_longitude is null
          or pl.latitude is null
          or pl.longitude is null
        then null
        else (
          6371.0088 * acos(
            least(
              1,
              greatest(
                -1,
                cos(radians(p_latitude))
                * cos(radians(pl.latitude))
                * cos(radians(pl.longitude) - radians(p_longitude))
                + sin(radians(p_latitude))
                * sin(radians(pl.latitude))
              )
            )
          )
        )
      end as distance_km
    from public.discover_places pl
    where pl.active = true
  )
  select
    places.id,
    places.name,
    places.kind,
    places.note,
    places.distance_km,
    exists (
      select 1
      from public.saved_discover_places s
      where s.place_id = places.id
        and s.user_id = auth.uid()
    ) as saved_by_me
  from places
  where
    places.distance_km is null
    or p_radius_km is null
    or places.distance_km <= greatest(0, p_radius_km)
  order by places.distance_km nulls last, places.name asc;
$$;

revoke all on function public.get_discover_places(double precision, double precision, double precision) from public, anon;
grant execute on function public.get_discover_places(double precision, double precision, double precision) to authenticated;
