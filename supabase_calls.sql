-- Ming voice/video calling Realtime authorization
-- Run once in Supabase SQL Editor.
--
-- Call signaling is ephemeral. No call media is stored in Supabase.
-- WebRTC carries the actual audio/video; Supabase Realtime only carries
-- offers, answers, ICE candidates, and call state.
--
-- Topics:
--   ming:call:<userId>                         = private incoming-call inbox
--   ming:call:<callId>:<userA>:<userB>        = private per-call signaling room
--
-- The two participants use the SAME per-call room for offer/answer/ICE.

drop policy if exists "Ming call realtime read" on realtime.messages;
create policy "Ming call realtime read"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and split_part(realtime.topic(), ':', 1) = 'ming'
  and split_part(realtime.topic(), ':', 2) = 'call'
  and (
    -- Incoming-call inbox: only the owner can receive offers.
    (
      array_length(string_to_array(realtime.topic(), ':'), 1) = 3
      and split_part(realtime.topic(), ':', 3)::uuid = (select auth.uid())
    )
    or
    -- Per-call room: only the two connected participants can join.
    (
      array_length(string_to_array(realtime.topic(), ':'), 1) = 5
      and exists (
        select 1
        from public.connections c
        where c.status = 'accepted'
          and (
            (
              c.requester_id = (select auth.uid())
              and c.recipient_id = split_part(realtime.topic(), ':', 5)::uuid
              and c.requester_id = split_part(realtime.topic(), ':', 4)::uuid
            )
            or
            (
              c.recipient_id = (select auth.uid())
              and c.requester_id = split_part(realtime.topic(), ':', 4)::uuid
              and c.requester_id = split_part(realtime.topic(), ':', 5)::uuid
            )
          )
      )
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
  and (
    -- Users may send into their own incoming-call inbox only when
    -- the target is the other side of an accepted connection.
    (
      array_length(string_to_array(realtime.topic(), ':'), 1) = 3
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
    )
    or
    -- Per-call room: either participant can send signaling messages.
    (
      array_length(string_to_array(realtime.topic(), ':'), 1) = 5
      and exists (
        select 1
        from public.connections c
        where c.status = 'accepted'
          and (
            (
              c.requester_id = (select auth.uid())
              and c.recipient_id = split_part(realtime.topic(), ':', 5)::uuid
              and c.requester_id = split_part(realtime.topic(), ':', 4)::uuid
            )
            or
            (
              c.recipient_id = (select auth.uid())
              and c.requester_id = split_part(realtime.topic(), ':', 4)::uuid
              and c.recipient_id = split_part(realtime.topic(), ':', 5)::uuid
            )
          )
      )
    )
  )
);
