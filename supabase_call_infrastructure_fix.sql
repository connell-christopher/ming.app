-- DATA API GRANTS
-- Supabase projects created with the newer Data API defaults may not
-- automatically expose new public tables. These grants are still protected
-- by the RLS policies below; they only make the tables reachable by the
-- authenticated PostgREST role.

grant select, insert, update, delete
on table public.ming_call_invites
to authenticated;

grant select, insert, update, delete
on table public.ming_push_subscriptions
to authenticated;


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
--
-- The caller must temporarily be able to JOIN the recipient's private
-- inbox after the pending invite has been written. Realtime evaluates
-- realtime.messages authorization in its own transaction, so keep the
-- cross-table invite check inside a small SECURITY DEFINER helper.
-- This avoids the invite table's normal RLS policies becoming part of
-- the Realtime authorization decision.

create or replace function public.ming_can_read_call_inbox(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $
  select exists (
    select 1
    from public.ming_call_invites i
    where i.caller_id = (select auth.uid())
      and i.recipient_id = target_user
      and i.status = 'pending'
      and i.expires_at > now()
  );
$;

revoke all on function public.ming_can_read_call_inbox(uuid) from public;
grant execute on function public.ming_can_read_call_inbox(uuid) to authenticated;

drop policy if exists "Ming call inbox receive" on realtime.messages;
drop policy if exists "Ming call inbox send" on realtime.messages;

create policy "Ming call inbox receive"
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and (
    (select realtime.topic()) =
      'ming:call:' || (select auth.uid())::text
    or public.ming_can_read_call_inbox(
      split_part((select realtime.topic()), ':', 3)::uuid
    )
  )
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
