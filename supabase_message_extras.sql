-- Ming message extras: replies, reactions, and private voice notes
alter table public.messages
  add column if not exists message_type text not null default 'text'
    check (message_type in ('text','voice')),
  add column if not exists voice_path text,
  add column if not exists voice_duration integer,
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null;

create index if not exists messages_reply_to_idx
on public.messages(reply_to_id);

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique(message_id, user_id, emoji)
);

create index if not exists message_reactions_message_idx
on public.message_reactions(message_id);

alter table public.message_reactions enable row level security;

revoke all on public.message_reactions from anon;
grant select, insert, delete on public.message_reactions to authenticated;

drop policy if exists "Users can view reactions on their messages" on public.message_reactions;
create policy "Users can view reactions on their messages"
on public.message_reactions for select to authenticated
using (
  exists (
    select 1 from public.messages m
    where m.id = message_id
      and (m.sender_id = (select auth.uid()) or m.recipient_id = (select auth.uid()))
  )
);

drop policy if exists "Users can react in their conversations" on public.message_reactions;
create policy "Users can react in their conversations"
on public.message_reactions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.messages m
    where m.id = message_id
      and (m.sender_id = (select auth.uid()) or m.recipient_id = (select auth.uid()))
  )
);

drop policy if exists "Users can remove their reactions" on public.message_reactions;
create policy "Users can remove their reactions"
on public.message_reactions for delete to authenticated
using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public)
values ('ming-voice', 'ming-voice', false)
on conflict (id) do nothing;

drop policy if exists "Ming voice upload" on storage.objects;
create policy "Ming voice upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'ming-voice'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Ming voice read" on storage.objects;
create policy "Ming voice read"
on storage.objects for select to authenticated
using (
  bucket_id = 'ming-voice'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.messages m
      where m.voice_path = name
        and (m.sender_id = (select auth.uid()) or m.recipient_id = (select auth.uid()))
    )
  )
);

drop policy if exists "Ming voice delete" on storage.objects;
create policy "Ming voice delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'ming-voice'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

grant select, insert, update on public.messages to authenticated;

-- Realtime reactions can be enabled later if desired; current UI reloads reactions immediately.
