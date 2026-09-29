-- Ming Spaces Workspace v2
-- Run AFTER supabase_spaces_migration.sql.
-- Adds persistent workspace content, marketplace listings, themes, media metadata,
-- real invitation rotation, and secure private Space media storage.

alter table public.ming_spaces
  add column if not exists theme jsonb not null default '{}'::jsonb;

create table if not exists public.ming_space_content (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.ming_spaces(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (char_length(btrim(kind)) between 1 and 40),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ming_space_content_space_created_idx
  on public.ming_space_content(space_id, created_at desc);
create index if not exists ming_space_content_author_idx
  on public.ming_space_content(author_id);

create table if not exists public.ming_space_products (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.ming_spaces(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  price numeric(18,2) not null check (price > 0),
  asset text not null default 'USDT',
  condition text not null default 'Used',
  category text not null default 'Other',
  qty integer not null default 1 check (qty > 0),
  handover text not null default 'Either',
  description text not null default '',
  media jsonb not null default '[]'::jsonb,
  status text not null default 'listed' check (status in ('listed','reserved','sold','removed')),
  auction jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ming_space_products_space_idx
  on public.ming_space_products(space_id, created_at desc);
create index if not exists ming_space_products_seller_idx
  on public.ming_space_products(seller_id);

create table if not exists public.ming_space_files (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.ming_spaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid references public.ming_space_content(id) on delete cascade,
  product_id uuid references public.ming_space_products(id) on delete cascade,
  storage_path text not null unique,
  filename text not null,
  content_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  kind text not null default 'file',
  created_at timestamptz not null default now()
);

create index if not exists ming_space_files_space_idx
  on public.ming_space_files(space_id, created_at desc);

alter table public.ming_space_content enable row level security;
alter table public.ming_space_products enable row level security;
alter table public.ming_space_files enable row level security;

revoke all on table public.ming_space_content, public.ming_space_products, public.ming_space_files from anon;
grant select on public.ming_space_content, public.ming_space_products, public.ming_space_files to authenticated;

drop policy if exists "space members can read content" on public.ming_space_content;
create policy "space members can read content"
on public.ming_space_content for select to authenticated
using (
  exists (
    select 1 from public.ming_space_members m
    where m.space_id = ming_space_content.space_id
      and m.user_id = (select auth.uid())
      and m.approved = true
  )
);

drop policy if exists "space members can read products" on public.ming_space_products;
create policy "space members can read products"
on public.ming_space_products for select to authenticated
using (
  exists (
    select 1 from public.ming_space_members m
    where m.space_id = ming_space_products.space_id
      and m.user_id = (select auth.uid())
      and m.approved = true
  )
);

drop policy if exists "space members can read files" on public.ming_space_files;
create policy "space members can read files"
on public.ming_space_files for select to authenticated
using (
  exists (
    select 1 from public.ming_space_members m
    where m.space_id = ming_space_files.space_id
      and m.user_id = (select auth.uid())
      and m.approved = true
  )
);

-- Storage bucket. Files themselves belong in Storage; their metadata/path belongs
-- in Postgres. This is the normal Supabase architecture for images/video/audio.
insert into storage.buckets (id, name, public)
values ('ming-space-media', 'ming-space-media', false)
on conflict (id) do update set public = false;

drop policy if exists "Space members upload media" on storage.objects;
create policy "Space members upload media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'ming-space-media'
  and exists (
    select 1
    from public.ming_space_members m
    where m.space_id = split_part(name, '/', 1)::uuid
      and m.user_id = (select auth.uid())
      and m.approved = true
  )
);

drop policy if exists "Space members read media" on storage.objects;
create policy "Space members read media"
on storage.objects for select to authenticated
using (
  bucket_id = 'ming-space-media'
  and exists (
    select 1
    from public.ming_space_members m
    where m.space_id = split_part(name, '/', 1)::uuid
      and m.user_id = (select auth.uid())
      and m.approved = true
  )
);

drop policy if exists "Space members update own media" on storage.objects;
create policy "Space members update own media"
on storage.objects for update to authenticated
using (
  bucket_id = 'ming-space-media'
  and owner_id = (select auth.uid())
)
with check (
  bucket_id = 'ming-space-media'
  and owner_id = (select auth.uid())
);

drop policy if exists "Space members delete own media" on storage.objects;
create policy "Space members delete own media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'ming-space-media'
  and owner_id = (select auth.uid())
);

create or replace function public.get_my_ming_space_content()
returns table (
  id uuid,
  space_id uuid,
  author_id uuid,
  kind text,
  payload jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select c.id, c.space_id, c.author_id, c.kind, c.payload, c.created_at, c.updated_at
  from public.ming_space_content c
  where exists (
    select 1 from public.ming_space_members m
    where m.space_id = c.space_id
      and m.user_id = (select auth.uid())
      and m.approved = true
  )
  order by c.created_at desc;
$$;

create or replace function public.create_ming_space_content(
  p_space_id uuid,
  p_kind text,
  p_payload jsonb default '{}'::jsonb
)
returns public.ming_space_content
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.ming_space_content;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.ming_space_members
    where space_id = p_space_id and user_id = auth.uid() and approved = true
  ) then
    raise exception 'You are not a member of this Space.';
  end if;
  insert into public.ming_space_content(space_id, author_id, kind, payload)
  values(p_space_id, auth.uid(), btrim(p_kind), coalesce(p_payload, '{}'::jsonb))
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.update_ming_space_content(
  p_id uuid,
  p_payload jsonb
)
returns public.ming_space_content
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.ming_space_content;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.ming_space_content c
  set payload = coalesce(p_payload, '{}'::jsonb), updated_at = now()
  where c.id = p_id
    and (
      c.author_id = auth.uid()
      or exists (
        select 1 from public.ming_spaces s
        where s.id = c.space_id and s.owner_id = auth.uid()
      )
    )
  returning * into v_row;
  if not found then raise exception 'Content not found or not permitted.'; end if;
  return v_row;
end;
$$;

create or replace function public.create_ming_space_product(
  p_space_id uuid,
  p_title text,
  p_price numeric,
  p_condition text,
  p_category text,
  p_handover text,
  p_description text default '',
  p_qty integer default 1,
  p_media jsonb default '[]'::jsonb,
  p_auction jsonb default '{}'::jsonb
)
returns public.ming_space_products
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.ming_space_products;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.ming_space_members
    where space_id = p_space_id and user_id = auth.uid()
      and approved = true and role in ('owner','seller')
  ) then
    raise exception 'You need the seller role in this Space.';
  end if;
  insert into public.ming_space_products(
    space_id,seller_id,title,price,condition,category,handover,description,qty,media,auction
  )
  values(
    p_space_id,auth.uid(),btrim(p_title),p_price,coalesce(p_condition,'Used'),
    coalesce(p_category,'Other'),coalesce(p_handover,'Either'),coalesce(p_description,''),
    greatest(coalesce(p_qty,1),1),coalesce(p_media,'[]'::jsonb),coalesce(p_auction,'{}'::jsonb)
  )
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.get_my_ming_space_products()
returns setof public.ming_space_products
language sql
security definer
set search_path = ''
stable
as $$
  select p.*
  from public.ming_space_products p
  where exists (
    select 1 from public.ming_space_members m
    where m.space_id = p.space_id
      and m.user_id = (select auth.uid())
      and m.approved = true
  )
  order by p.created_at desc;
$$;

create or replace function public.record_ming_space_file(
  p_space_id uuid,
  p_storage_path text,
  p_filename text,
  p_content_type text,
  p_size_bytes bigint default 0,
  p_kind text default 'file',
  p_content_id uuid default null,
  p_product_id uuid default null
)
returns public.ming_space_files
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.ming_space_files;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.ming_space_members
    where space_id = p_space_id and user_id = auth.uid() and approved = true
  ) then
    raise exception 'You are not a member of this Space.';
  end if;
  insert into public.ming_space_files(
    space_id,owner_id,content_id,product_id,storage_path,filename,content_type,size_bytes,kind
  )
  values(
    p_space_id,auth.uid(),p_content_id,p_product_id,p_storage_path,p_filename,
    coalesce(p_content_type,'application/octet-stream'),coalesce(p_size_bytes,0),coalesce(p_kind,'file')
  )
  returning * into v_row;
  return v_row;
end;
$$;

-- Real invitation rotation. The old client-side random-code path is no longer
-- authoritative once this function is installed.
create or replace function public.rotate_ming_space_invite(
  p_space_id uuid,
  p_ttl_hours integer default 24,
  p_max_uses integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_code text;
  v_hash text;
  v_version integer;
  v_invite public.ming_space_invites;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.ming_spaces
    where id = p_space_id and owner_id = v_user
  ) then
    raise exception 'Only the creator can regenerate the invitation.';
  end if;

  update public.ming_space_invites
  set revoked = true
  where space_id = p_space_id and revoked = false;

  select coalesce(max(version),0)+1 into v_version
  from public.ming_space_invites where space_id = p_space_id;

  v_code := upper(
    substr(md5(random()::text || clock_timestamp()::text || v_user::text),1,4)
    || '-' ||
    substr(md5(random()::text || clock_timestamp()::text || p_space_id::text),1,4)
  );
  v_hash := encode(extensions.digest(v_code,'sha256'),'hex');

  insert into public.ming_space_invites(space_id,code_hash,hint,expires_at,max_uses,version)
  values(
    p_space_id,v_hash,right(v_code,2),
    case when coalesce(p_ttl_hours,24)>0 then now()+make_interval(hours=>coalesce(p_ttl_hours,24)) else null end,
    p_max_uses,v_version
  )
  returning * into v_invite;

  return jsonb_build_object(
    'code',v_code,
    'invite',jsonb_build_object(
      'id',v_invite.id,'codeHash',v_invite.code_hash,'hint',v_invite.hint,
      'createdAt',v_invite.created_at,'expiresAt',v_invite.expires_at,
      'maxUses',v_invite.max_uses,'uses',v_invite.uses,'revoked',v_invite.revoked,
      'version',v_invite.version
    )
  );
end;
$$;

create or replace function public.leave_ming_space(p_space_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (
    select 1 from public.ming_space_members
    where space_id=p_space_id and user_id=auth.uid() and role='owner'
  ) then
    raise exception 'The creator must delete or transfer this Space before leaving.';
  end if;
  delete from public.ming_space_members
  where space_id=p_space_id and user_id=auth.uid();
end;
$$;

revoke execute on function public.get_my_ming_space_content() from public, anon;
revoke execute on function public.create_ming_space_content(uuid,text,jsonb) from public, anon;
revoke execute on function public.update_ming_space_content(uuid,jsonb) from public, anon;
revoke execute on function public.create_ming_space_product(uuid,text,numeric,text,text,text,text,integer,jsonb,jsonb) from public, anon;
revoke execute on function public.get_my_ming_space_products() from public, anon;
revoke execute on function public.record_ming_space_file(uuid,text,text,text,bigint,text,uuid,uuid) from public, anon;
revoke execute on function public.rotate_ming_space_invite(uuid,integer,integer) from public, anon;
revoke execute on function public.leave_ming_space(uuid) from public, anon;

grant execute on function public.get_my_ming_space_content() to authenticated;
grant execute on function public.create_ming_space_content(uuid,text,jsonb) to authenticated;
grant execute on function public.update_ming_space_content(uuid,jsonb) to authenticated;
grant execute on function public.create_ming_space_product(uuid,text,numeric,text,text,text,text,integer,jsonb,jsonb) to authenticated;
grant execute on function public.get_my_ming_space_products() to authenticated;
grant execute on function public.record_ming_space_file(uuid,text,text,text,bigint,text,uuid,uuid) to authenticated;
grant execute on function public.rotate_ming_space_invite(uuid,integer,integer) to authenticated;
grant execute on function public.leave_ming_space(uuid) to authenticated;
