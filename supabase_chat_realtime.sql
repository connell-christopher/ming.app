-- Ming private realtime chat presence + typing authorization
-- Run once in Supabase SQL Editor.
--
-- This authorizes only users who already have an accepted connection
-- with the other participant in the chat topic.

drop policy if exists "Ming chat realtime read" on realtime.messages;
create policy "Ming chat realtime read"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and split_part(realtime.topic(), ':', 1) = 'ming'
  and split_part(realtime.topic(), ':', 2) = 'chat'
  and exists (
    select 1
    from public.connections c
    where c.status = 'accepted'
      and (
        (c.requester_id = auth.uid()
          and c.recipient_id = split_part(realtime.topic(), ':', 4)::uuid)
        or
        (c.recipient_id = auth.uid()
          and c.requester_id = split_part(realtime.topic(), ':', 4)::uuid)
      )
      and split_part(realtime.topic(), ':', 3)::uuid = least(
        c.requester_id,
        c.recipient_id
      )
      and split_part(realtime.topic(), ':', 4)::uuid = greatest(
        c.requester_id,
        c.recipient_id
      )
  )
);

drop policy if exists "Ming chat realtime write" on realtime.messages;
create policy "Ming chat realtime write"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension in ('broadcast', 'presence')
  and split_part(realtime.topic(), ':', 1) = 'ming'
  and split_part(realtime.topic(), ':', 2) = 'chat'
  and exists (
    select 1
    from public.connections c
    where c.status = 'accepted'
      and (
        (c.requester_id = auth.uid()
          and c.recipient_id = split_part(realtime.topic(), ':', 4)::uuid)
        or
        (c.recipient_id = auth.uid()
          and c.requester_id = split_part(realtime.topic(), ':', 4)::uuid)
      )
      and split_part(realtime.topic(), ':', 3)::uuid = least(
        c.requester_id,
        c.recipient_id
      )
      and split_part(realtime.topic(), ':', 4)::uuid = greatest(
        c.requester_id,
        c.recipient_id
      )
  )
);

-- IMPORTANT:
-- In Supabase Dashboard > Project Settings > Realtime Settings,
-- "Allow public access to channels" can remain enabled while testing.
-- The client uses private: true, so these RLS policies authorize the
-- chat channel. For production, private-only channels can be enabled.
