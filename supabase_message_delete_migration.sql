-- Ming message deletion support
-- Run once in the Supabase SQL Editor.
--
-- Rules:
-- 1. Delete for everyone is allowed only for the sender and only within 30 minutes.
-- 2. Delete for me only hides the message for the current user.
-- 3. Message media remains private and is cleaned up by the client after
--    a successful permanent message deletion.

create table if not exists public.message_hidden_for_users (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_hidden_for_users_user_idx
on public.message_hidden_for_users(user_id, created_at desc);

alter table public.message_hidden_for_users enable row level security;

revoke all on public.message_hidden_for_users from anon;
grant select, insert, delete on public.message_hidden_for_users to authenticated;

drop policy if exists "Users can view their hidden messages" on public.message_hidden_for_users;
create policy "Users can view their hidden messages"
on public.message_hidden_for_users
for select
to authenticated
using (
  user_id = (select auth.uid())
);

drop policy if exists "Users can hide their own messages" on public.message_hidden_for_users;
create policy "Users can hide their own messages"
on public.message_hidden_for_users
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.messages m
    where m.id = message_id
      and (m.sender_id = (select auth.uid()) or m.recipient_id = (select auth.uid()))
  )
);

drop policy if exists "Users can unhide their own messages" on public.message_hidden_for_users;
create policy "Users can unhide their own messages"
on public.message_hidden_for_users
for delete
to authenticated
using (
  user_id = (select auth.uid())
);

-- Permanent deletion is intentionally restricted at the database level.
-- Even if someone tampers with the client, a sender cannot permanently
-- delete a message after the 30-minute window.
grant delete on public.messages to authenticated;

drop policy if exists "Users can delete their own messages within 30 minutes" on public.messages;
create policy "Users can delete their own messages within 30 minutes"
on public.messages
for delete
to authenticated
using (
  sender_id = (select auth.uid())
  and created_at >= now() - interval '30 minutes'
);

-- messages is already part of supabase_realtime in the existing
-- messaging migration. DELETE events are handled by the client by id.
