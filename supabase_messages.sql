-- Ming real messaging
-- Run once in Supabase SQL Editor.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_no_self check (sender_id <> recipient_id)
);

create index if not exists messages_sender_created_idx
on public.messages(sender_id, created_at desc);

create index if not exists messages_recipient_created_idx
on public.messages(recipient_id, created_at desc);

alter table public.messages enable row level security;

revoke all on table public.messages from anon;
grant select, insert, update on table public.messages to authenticated;

drop policy if exists "Users can view their messages" on public.messages;
create policy "Users can view their messages"
on public.messages
for select
to authenticated
using (
  (select auth.uid()) = sender_id
  or (select auth.uid()) = recipient_id
);

drop policy if exists "Connected users can send messages" on public.messages;
create policy "Connected users can send messages"
on public.messages
for insert
to authenticated
with check (
  (select auth.uid()) = sender_id
  and exists (
    select 1
    from public.connections c
    where c.status = 'accepted'
      and (
        (c.requester_id = sender_id and c.recipient_id = recipient_id)
        or
        (c.requester_id = recipient_id and c.recipient_id = sender_id)
      )
  )
);

drop policy if exists "Recipients can mark messages read" on public.messages;
create policy "Recipients can mark messages read"
on public.messages
for update
to authenticated
using ((select auth.uid()) = recipient_id)
with check ((select auth.uid()) = recipient_id);

-- Enable Supabase Realtime for incoming messages.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;
