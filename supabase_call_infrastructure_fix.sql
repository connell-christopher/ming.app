-- CALL INVITES

drop policy if exists "Ming call invites select own calls" on public.ming_call_invites;
drop policy if exists "Ming call invites insert caller" on public.ming_call_invites;
drop policy if exists "Ming call invites update participants" on public.ming_call_invites;

create policy "Ming call invites select own calls"
on public.ming_call_invites
for select
to authenticated
using (
  (select auth.uid()) = caller_id
  or (select auth.uid()) = recipient_id
);

create policy "Ming call invites insert caller"
on public.ming_call_invites
for insert
to authenticated
with check (
  (select auth.uid()) = caller_id
);

create policy "Ming call invites update participants"
on public.ming_call_invites
for update
to authenticated
using (
  (select auth.uid()) = caller_id
  or (select auth.uid()) = recipient_id
)
with check (
  (select auth.uid()) = caller_id
  or (select auth.uid()) = recipient_id
);


-- PUSH SUBSCRIPTIONS

drop policy if exists "Ming push subscriptions select own" on public.ming_push_subscriptions;
drop policy if exists "Ming push subscriptions insert own" on public.ming_push_subscriptions;
drop policy if exists "Ming push subscriptions update own" on public.ming_push_subscriptions;
drop policy if exists "Ming push subscriptions delete own" on public.ming_push_subscriptions;

create policy "Ming push subscriptions select own"
on public.ming_push_subscriptions
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

create policy "Ming push subscriptions insert own"
on public.ming_push_subscriptions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
);

create policy "Ming push subscriptions update own"
on public.ming_push_subscriptions
for update
to authenticated
using (
  (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = user_id
);

create policy "Ming push subscriptions delete own"
on public.ming_push_subscriptions
for delete
to authenticated
using (
  (select auth.uid()) = user_id
);


-- PRIVATE CALL REALTIME

drop policy if exists "Ming call inbox receive" on realtime.messages;
drop policy if exists "Ming call inbox send" on realtime.messages;

create policy "Ming call inbox receive"
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and (select realtime.topic()) =
      'ming:call:' || (select auth.uid())::text
);

create policy "Ming call inbox send"
on realtime.messages
for insert
to authenticated
with check (
  extension = 'broadcast'
  and (select realtime.topic()) like 'ming:call:%'
  and split_part((select realtime.topic()), ':', 1) = 'ming'
  and split_part((select realtime.topic()), ':', 2) = 'call'
  and exists (
    select 1
    from public.connections c
    where c.status = 'accepted'
      and (
        (
          c.requester_id = (select auth.uid())
          and c.recipient_id =
              split_part((select realtime.topic()), ':', 3)::uuid
        )
        or
        (
          c.recipient_id = (select auth.uid())
          and c.requester_id =
              split_part((select realtime.topic()), ':', 3)::uuid
        )
      )
  )
);
