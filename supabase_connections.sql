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
