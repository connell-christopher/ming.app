-- Ming voice/video calling Realtime authorization
-- Run once in Supabase SQL Editor.
--
-- Call signaling is ephemeral. No call media is stored in Supabase.
-- WebRTC carries the actual audio/video; Supabase Realtime only carries
-- offers, answers, ICE candidates, and call state.

drop policy if exists "Ming call realtime read" on realtime.messages;
create policy "Ming call realtime read"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and split_part(realtime.topic(), ':', 1) = 'ming'
  and split_part(realtime.topic(), ':', 2) = 'call'
  and exists (
    select 1
    from public.connections c
    where c.status = 'accepted'
      and (
        (c.requester_id = (select auth.uid())
          and c.recipient_id = split_part(realtime.topic(), ':', 3)::uuid)
        or
        (c.recipient_id = (select auth.uid())
          and c.requester_id = split_part(realtime.topic(), ':', 3)::uuid)
      )
  )
);

drop policy if exists "Ming call realtime write" on realtime.messages;
create policy "Ming call realtime write"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and split_part(realtime.topic(), ':', 1) = 'ming'
  and split_part(realtime.topic(), ':', 2) = 'call'
  and exists (
    select 1
    from public.connections c
    where c.status = 'accepted'
      and (
        (c.requester_id = (select auth.uid())
          and c.recipient_id = split_part(realtime.topic(), ':', 3)::uuid)
        or
        (c.recipient_id = (select auth.uid())
          and c.requester_id = split_part(realtime.topic(), ':', 3)::uuid)
      )
  )
);
