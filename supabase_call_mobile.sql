-- Ming mobile call delivery
-- Run this once in Supabase SQL Editor after supabase_calls.sql.

create table if not exists public.ming_call_invites (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null unique,
  caller_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'voice' check (kind in ('voice', 'video')),
  offer jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'ended', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists ming_call_invites_recipient_status_idx
  on public.ming_call_invites (recipient_id, status, expires_at desc);

alter table public.ming_call_invites enable row level security;

drop policy if exists "Ming call invites insert" on public.ming_call_invites;
create policy "Ming call invites insert"
on public.ming_call_invites
for insert
to authenticated
with check (
  caller_id = (select auth.uid())
  and exists (
    select 1
    from public.connections c
    where c.status = 'accepted'
      and (
        (c.requester_id = (select auth.uid()) and c.recipient_id = recipient_id)
        or
        (c.recipient_id = (select auth.uid()) and c.requester_id = recipient_id)
      )
  )
);

drop policy if exists "Ming call invites read" on public.ming_call_invites;
create policy "Ming call invites read"
on public.ming_call_invites
for select
to authenticated
using (
  caller_id = (select auth.uid())
  or recipient_id = (select auth.uid())
);

drop policy if exists "Ming call invites update" on public.ming_call_invites;
create policy "Ming call invites update"
on public.ming_call_invites
for update
to authenticated
using (
  caller_id = (select auth.uid())
  or recipient_id = (select auth.uid())
)
with check (
  caller_id = (select auth.uid())
  or recipient_id = (select auth.uid())
);

create table if not exists public.ming_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ming_push_subscriptions_user_idx
  on public.ming_push_subscriptions (user_id);

alter table public.ming_push_subscriptions enable row level security;

drop policy if exists "Ming push subscriptions owner" on public.ming_push_subscriptions;
create policy "Ming push subscriptions owner"
on public.ming_push_subscriptions
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Prevent stale pending invitations from being selected after their expiry.
update public.ming_call_invites
set status = 'expired', updated_at = now()
where status = 'pending'
  and expires_at <= now();
