-- Ming production message attachments
-- Run after supabase_messages.sql and supabase_message_extras.sql.

alter table public.messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size bigint;

alter table public.messages drop constraint if exists messages_body_type_check;
alter table public.messages add constraint messages_body_type_check check (
  (message_type = 'text' and char_length(trim(body)) between 1 and 2000)
  or (message_type = 'voice' and char_length(body) = 0 and voice_path is not null)
  or (message_type in ('image','file') and char_length(body) = 0 and attachment_path is not null)
);

alter table public.messages drop constraint if exists messages_message_type_valid;
alter table public.messages add constraint messages_message_type_valid
  check (message_type in ('text','voice','image','file'));

create index if not exists messages_attachment_path_idx on public.messages(attachment_path)
where attachment_path is not null;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('ming-message-files','ming-message-files',false,15728640,array[
  'image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'
])
on conflict (id) do update set public=false,file_size_limit=15728640,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Ming message files upload" on storage.objects;
create policy "Ming message files upload" on storage.objects for insert to authenticated
with check (bucket_id='ming-message-files' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "Ming message files read" on storage.objects;
create policy "Ming message files read" on storage.objects for select to authenticated
using (
  bucket_id='ming-message-files' and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or exists(select 1 from public.messages m where m.attachment_path=name and (m.sender_id=(select auth.uid()) or m.recipient_id=(select auth.uid())))
  )
);

drop policy if exists "Ming message files update" on storage.objects;
create policy "Ming message files update" on storage.objects for update to authenticated
using (bucket_id='ming-message-files' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='ming-message-files' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "Ming message files delete" on storage.objects;
create policy "Ming message files delete" on storage.objects for delete to authenticated
using (bucket_id='ming-message-files' and (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace function public.ming_send_message_v3(
  p_recipient_id uuid,p_body text,p_message_type text default 'text',
  p_voice_path text default null,p_voice_duration integer default null,p_reply_to_id uuid default null,
  p_attachment_path text default null,p_attachment_name text default null,
  p_attachment_mime text default null,p_attachment_size bigint default null
)
returns public.messages language plpgsql security definer set search_path=public as $$
declare v_sender_id uuid:=auth.uid(); v_message public.messages;
begin
  if v_sender_id is null then raise exception 'Not authenticated'; end if;
  if p_recipient_id is null or p_recipient_id=v_sender_id then raise exception 'Invalid recipient'; end if;
  if not public.ming_users_are_connected(v_sender_id,p_recipient_id) then raise exception 'Users are not connected'; end if;
  if p_message_type='text' then
    if p_body is null or char_length(trim(p_body))<1 or char_length(p_body)>2000 then raise exception 'Message must be between 1 and 2000 characters'; end if;
  elsif p_message_type='voice' then
    if p_voice_path is null then raise exception 'Voice note is missing'; end if;
  elsif p_message_type in ('image','file') then
    if p_attachment_path is null or char_length(trim(p_attachment_path))<1 then raise exception 'Attachment is missing'; end if;
    if p_attachment_size is not null and p_attachment_size>15728640 then raise exception 'Attachment is too large'; end if;
  else raise exception 'Unsupported message type'; end if;
  if p_reply_to_id is not null and not exists(
    select 1 from public.messages m where m.id=p_reply_to_id and
    ((m.sender_id=v_sender_id and m.recipient_id=p_recipient_id) or (m.sender_id=p_recipient_id and m.recipient_id=v_sender_id))
  ) then raise exception 'Invalid reply target'; end if;
  insert into public.messages(sender_id,recipient_id,body,message_type,voice_path,voice_duration,reply_to_id,attachment_path,attachment_name,attachment_mime,attachment_size)
  values(v_sender_id,p_recipient_id,coalesce(trim(p_body),''),p_message_type,p_voice_path,p_voice_duration,p_reply_to_id,p_attachment_path,p_attachment_name,p_attachment_mime,p_attachment_size)
  returning * into v_message;
  return v_message;
end; $$;
revoke all on function public.ming_send_message_v3(uuid,text,text,text,integer,uuid,text,text,text,bigint) from public;
grant execute on function public.ming_send_message_v3(uuid,text,text,text,integer,uuid,text,text,text,bigint) to authenticated;
