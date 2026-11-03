-- Nhóm ghép: Ghép xe (ride), Ghép trận (sport) — tuần 7
-- Mục đích: chủ nhóm tạo nhóm có giờ diễn ra + số chỗ; người khác xin / tham gia đến khi đủ; nhóm tự full / mở lại;
--   mỗi nhóm có chat nhóm riêng (tạo khi tạo nhóm); thông báo cho chủ nhóm / người xin; trang công khai cho web SEO.
-- Bảng: groups, group_members. View: public_groups (anon + authenticated). Publication thêm groups, group_members.
-- RPC: search_groups, get_group_by_slug (anon được, invoker); list_group_members (invoker);
--   join_group_tx, respond_join_tx (definer, select … for update — gọi từ Edge Function join-group / respond-join);
--   leave_group (definer). Huỷ nhóm: chủ nhóm update status = 'cancelled' qua PostgREST (guard).
-- Client: @hp/core groups.ts + functions.ts + hooks; Zod @hp/shared schemas/group; type sinh lại ở packages/db.
--
-- Thiết kế
-- - seats_total = số chỗ dành cho người khác (không tính chủ nhóm); seats_taken = số thành viên accepted (trigger đếm).
--   Chủ nhóm không có dòng trong group_members (là host_id), nhưng là member của chat nhóm.
-- - requires_approval = false → tham gia là accepted ngay (chiếm chỗ); true → requested, chủ nhóm duyệt.
--   requested không giữ chỗ: duyệt khi đã đủ chỗ → group_full.
-- - group_members chỉ ghi qua RPC definer (khoá dòng nhóm để không vượt số chỗ khi nhiều người bấm cùng lúc).
-- - Trạng thái open ↔ full do trigger tính lại mỗi khi seats_taken / seats_total đổi; in_progress / completed do cron
--   (tuần 8, expire-content). Hết giờ (starts_at qua) nhưng cron chưa chạy: danh sách lọc starts_at > now().
-- - Vị trí công khai làm tròn lưới 0.003° (~300 m) như public_listings; bảng gốc chỉ chủ nhóm + staff đọc.
-- - Lọc nội dung lời nhắn khi xin tham gia bằng chat_message_violation (SĐT / từ cấm) như chat.
--
-- Ma trận quyền
-- | Vai trò   | groups (bảng gốc)               | group_members                         | public_groups / search | RPC ghi             |
-- |-----------|---------------------------------|---------------------------------------|------------------------|---------------------|
-- | anon      | –                               | –                                     | đọc                    | –                   |
-- | user      | tạo (10 / 24h), host đọc / sửa,  | đọc dòng mình; host đọc cả nhóm;       | đọc (ẩn khi chặn)      | join / leave;       |
-- |           | huỷ (cancelled)                 | accepted đọc accepted cùng nhóm        |                        | host: respond       |
-- | bị cấm    | host đọc, không tạo / sửa        | như user                              | đọc                    | không (banned)      |
-- | moderator | đọc tất cả                       | đọc tất cả                            | đọc                    | như user            |
--
-- Explain (seed 200 nhóm): search_groups dùng groups_kind_status_starts_idx (kind, status, starts_at);
--   get_group_by_slug dùng groups_short_id_key.

-- ═════════════════════════════════════════════════════════════════════════════
-- Enum
-- ═════════════════════════════════════════════════════════════════════════════
create type public.group_kind as enum ('ride', 'sport');
create type public.group_status as enum ('open', 'full', 'in_progress', 'completed', 'cancelled');
create type public.member_status as enum ('requested', 'accepted', 'declined', 'left', 'kicked');

-- ═════════════════════════════════════════════════════════════════════════════
-- groups
-- ═════════════════════════════════════════════════════════════════════════════
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references public.profiles (id),
  kind public.group_kind not null,
  sub_kind text not null,
  status public.group_status not null default 'open',
  title text not null check (char_length(btrim(title)) between 5 and 120),
  description text check (char_length(description) <= 2000),
  slug text unique,
  short_id text unique,
  site text references public.sites (code),
  starts_at timestamptz not null,
  ends_at timestamptz,
  seats_total int not null check (seats_total between 1 and 50),
  seats_taken int not null default 0 check (seats_taken >= 0),
  fee_per_person numeric(14, 0) not null default 0 check (fee_per_person between 0 and 100000000),
  origin extensions.geography(point, 4326),
  origin_text text not null check (char_length(btrim(origin_text)) between 2 and 200),   -- ride: điểm đi; sport: sân
  destination extensions.geography(point, 4326),
  destination_text text check (char_length(btrim(destination_text)) between 2 and 200),  -- ride: điểm đến
  attributes jsonb not null default '{}' check (jsonb_typeof(attributes) = 'object'),
  requires_approval boolean not null default true,
  conversation_id uuid references public.conversations (id) on delete set null,
  lang text not null default 'vi' check (lang in ('vi', 'en', 'zh')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((kind = 'ride' and sub_kind in ('car_owner', 'bus_pool', 'motorbike'))
      or (kind = 'sport' and sub_kind in ('football', 'badminton', 'pickleball'))),
  check (kind <> 'ride' or destination_text is not null),
  check (ends_at is null or ends_at > starts_at),
  check (seats_taken <= seats_total)
);
comment on table public.groups is 'Nhóm ghép (ride / sport). Công khai qua public_groups; bảng gốc chỉ chủ nhóm + staff.';
comment on column public.groups.seats_total is 'Số chỗ cho người khác (không tính chủ nhóm).';
comment on column public.groups.seats_taken is 'Số thành viên accepted — trigger trg_group_members_sync đếm, client không ghi.';
create index groups_kind_status_starts_idx on public.groups (kind, status, starts_at);
create index groups_host_idx on public.groups (host_id, created_at desc);
create index groups_origin_idx on public.groups using gist (origin);
create index groups_destination_idx on public.groups using gist (destination);
alter table public.groups enable row level security;
grant select, insert on public.groups to authenticated;
grant update (title, description, starts_at, ends_at, seats_total, fee_per_person, origin, origin_text, destination,
  destination_text, attributes, requires_approval, status) on public.groups to authenticated;
create trigger trg_groups_updated_at before update on public.groups
  for each row execute function public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- group_members
-- ═════════════════════════════════════════════════════════════════════════════
create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.member_status not null default 'requested',
  note text check (char_length(note) <= 200),   -- lời nhắn khi xin tham gia
  joined_at timestamptz not null default now(),
  responded_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
comment on table public.group_members is 'Thành viên nhóm (không gồm chủ nhóm). Chỉ ghi qua RPC join_group_tx / respond_join_tx / leave_group.';
create index group_members_user_idx on public.group_members (user_id, joined_at desc);
create index group_members_group_status_idx on public.group_members (group_id, status);
alter table public.group_members enable row level security;
grant select on public.group_members to authenticated;
create trigger trg_group_members_updated_at before update on public.group_members
  for each row execute function public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- Helper RLS
-- ═════════════════════════════════════════════════════════════════════════════
create function public.is_group_host(p_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.groups where id = p_group_id and host_id = (select auth.uid()));
$$;
comment on function public.is_group_host(uuid) is 'Người gọi là chủ nhóm.';
grant execute on function public.is_group_host(uuid) to authenticated;

create function public.is_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = (select auth.uid()) and status = 'accepted'
  );
$$;
comment on function public.is_group_member(uuid) is 'Người gọi là thành viên đã được nhận (accepted).';
grant execute on function public.is_group_member(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Policy
-- ═════════════════════════════════════════════════════════════════════════════
create policy groups_select_host_staff on public.groups for select to authenticated
  using (host_id = (select auth.uid()) or (select public.is_staff()));
create policy groups_insert_own on public.groups for insert to authenticated
  with check (host_id = (select auth.uid()) and not (select public.is_banned()));
create policy groups_update_host on public.groups for update to authenticated
  using (host_id = (select auth.uid()) and deleted_at is null)
  with check (host_id = (select auth.uid()) and not (select public.is_banned()));

create policy group_members_select on public.group_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_group_host(group_id)
    or (status = 'accepted' and public.is_group_member(group_id))
    or (select public.is_staff())
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- Trigger groups
-- ═════════════════════════════════════════════════════════════════════════════
-- guard (invoker: current_user = vai trò thật). Client: tạo nhóm open, giờ diễn ra từ 15 phút tới 60 ngày nữa
-- (GROUP_RULES ở @hp/shared); sửa: không đổi chủ / loại / số đã nhận / chat; status chỉ được
-- đặt 'cancelled' (từ open / full); nhóm đã huỷ / xong / đã diễn ra không sửa được; số chỗ không dưới số đã nhận.
-- Mọi vai trò: open ↔ full theo seats_taken / seats_total.
create function public.trg_groups_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.status <> 'open' or new.seats_taken <> 0 or new.conversation_id is not null or new.deleted_at is not null then
        raise exception using errcode = '42501', message = 'forbidden', detail = 'groups: cột chỉ server đặt';
      end if;
      if new.starts_at < now() + interval '15 minutes' then   -- GROUP_RULES.minLeadMinutes
        raise exception using errcode = 'P0001', message = 'starts_too_soon';
      end if;
      if new.starts_at > now() + interval '60 days' then      -- GROUP_RULES.maxDaysAhead
        raise exception using errcode = 'P0001', message = 'starts_too_far';
      end if;
      if new.kind = 'ride' and new.sub_kind = 'motorbike' and new.seats_total > 2 then   -- GROUP_RULES.motorbikeMaxSeats
        raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'groups: xe máy tối đa 2 chỗ';
      end if;
    else
      if new.host_id is distinct from old.host_id or new.kind is distinct from old.kind
         or new.sub_kind is distinct from old.sub_kind or new.seats_taken is distinct from old.seats_taken
         or new.conversation_id is distinct from old.conversation_id or new.site is distinct from old.site
         or new.deleted_at is distinct from old.deleted_at or new.lang is distinct from old.lang then
        raise exception using errcode = '42501', message = 'forbidden', detail = 'groups: cột không sửa được';
      end if;
      if old.status not in ('open', 'full') or old.starts_at <= now() then
        raise exception using errcode = 'P0001', message = 'group_closed';
      end if;
      if new.status is distinct from old.status and new.status <> 'cancelled' then
        raise exception using errcode = '42501', message = 'forbidden', detail = 'groups: chủ nhóm chỉ huỷ được nhóm';
      end if;
      if new.starts_at is distinct from old.starts_at
         and (new.starts_at < now() + interval '15 minutes' or new.starts_at > now() + interval '60 days') then
        raise exception using errcode = 'P0001', message = case when new.starts_at < now() then 'starts_too_soon' else 'starts_too_far' end;
      end if;
      if new.seats_total < old.seats_taken then
        raise exception using errcode = 'P0001', message = 'seats_below_taken';
      end if;
      if new.kind = 'ride' and new.sub_kind = 'motorbike' and new.seats_total > 2 then
        raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'groups: xe máy tối đa 2 chỗ';
      end if;
    end if;
  end if;

  new.title := btrim(new.title);
  new.origin_text := btrim(new.origin_text);
  new.destination_text := nullif(btrim(new.destination_text), '');
  new.description := nullif(btrim(new.description), '');
  if new.status in ('open', 'full') then
    new.status := case when new.seats_taken >= new.seats_total then 'full' else 'open' end;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_groups_guard() from public, anon, authenticated;
create trigger trg_groups_guard before insert or update on public.groups
  for each row execute function public.trg_groups_guard();

-- identity: short_id / slug như listings (đổi tiêu đề → slug mới, giữ short_id). Definer: gen_short_id / slugify
-- không cấp cho client (như trg_listings_identity).
create function public.trg_groups_identity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_try int := 0;
begin
  if tg_op = 'INSERT' then
    loop
      new.short_id := public.gen_short_id(6);
      exit when not exists (select 1 from public.groups where short_id = new.short_id);
      v_try := v_try + 1;
      if v_try > 5 then
        raise exception using errcode = 'P0001', message = 'conflict', detail = 'groups: không sinh được short_id';
      end if;
    end loop;
  else
    new.short_id := old.short_id;
  end if;
  if tg_op = 'INSERT' or new.title is distinct from old.title then
    new.slug := public.slugify(new.title) || '-' || new.short_id;
  else
    new.slug := old.slug;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_groups_identity() from public, anon, authenticated;
create trigger trg_groups_identity before insert or update on public.groups
  for each row execute function public.trg_groups_identity();

-- open_chat (definer, chạy sau guard / identity theo thứ tự tên): 10 nhóm / 24h cho client (assert_rate_limit chỉ
-- definer gọi được), tạo chat nhóm + chủ nhóm là member. context_id = new.id đã có (default chạy trước trigger BEFORE);
-- insert nhóm lỗi → chat rollback cùng câu lệnh.
create function public.trg_groups_open_chat()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('role', true), 'none') in ('anon', 'authenticated') then
    perform public.assert_rate_limit(new.host_id::text, 'create_group', 10, 86400);   -- RATE_LIMITS.groupsPerDay
  end if;
  if new.site is null then
    select site into new.site from public.profiles where id = new.host_id;
  end if;
  insert into public.conversations (kind, context_type, context_id, created_by)
  values ('group', 'group', new.id, new.host_id)
  returning id into new.conversation_id;
  insert into public.conversation_members (conversation_id, user_id) values (new.conversation_id, new.host_id);
  return new;
end;
$$;
revoke execute on function public.trg_groups_open_chat() from public, anon, authenticated;
create trigger trg_groups_open_chat before insert on public.groups
  for each row execute function public.trg_groups_open_chat();

-- Huỷ nhóm → thông báo group_cancelled cho người đã nhận / đang xin.
create function public.trg_groups_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    insert into public.notifications (user_id, type, title_key, body_key, params, data)
    select m.user_id, 'group_cancelled', 'group_cancelled.title', 'group_cancelled.body',
           jsonb_build_object('title', new.title),
           jsonb_build_object('screen', 'group', 'params', jsonb_build_object('id', new.id))
    from public.group_members m
    where m.group_id = new.id and m.status in ('accepted', 'requested');
  end if;
  return null;
end;
$$;
revoke execute on function public.trg_groups_after_update() from public, anon, authenticated;
create trigger trg_groups_after_update after update on public.groups
  for each row execute function public.trg_groups_after_update();

-- Webhook revalidate web (/nhom/[slug], /ghep-xe …) như listings. Chưa cấu hình → không gửi.
create function public.trg_groups_revalidate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url text := public.app_setting('web_revalidate_url');
  v_secret text := public.app_setting('web_revalidate_secret');
begin
  if v_url is null or v_secret is null then
    return null;
  end if;
  if tg_op = 'UPDATE'
     and (old.status, old.title, old.description, old.starts_at, old.seats_total, old.seats_taken, old.fee_per_person,
          old.origin_text, old.destination_text, old.attributes, old.deleted_at)
         is not distinct from
         (new.status, new.title, new.description, new.starts_at, new.seats_total, new.seats_taken, new.fee_per_person,
          new.origin_text, new.destination_text, new.attributes, new.deleted_at) then
    return null;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('tags', jsonb_build_array('group:' || new.id::text, 'groups')),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-revalidate-secret', v_secret)
  );
  return null;
end;
$$;
revoke execute on function public.trg_groups_revalidate() from public, anon, authenticated;
create trigger trg_groups_revalidate after insert or update on public.groups
  for each row execute function public.trg_groups_revalidate();

-- ═════════════════════════════════════════════════════════════════════════════
-- Trigger group_members: đếm chỗ, đồng bộ chat nhóm, thông báo
-- ═════════════════════════════════════════════════════════════════════════════
-- Thông báo (khoá ns push, data {screen: 'group', params: {id}}):
--   requested mới            → chủ nhóm: join_request (body: join_request.body)
--   accepted ngay (không duyệt) → chủ nhóm: join_request (body: join_request.body_joined)
--   requested → accepted     → người xin: join_accepted
--   requested → declined     → người xin: join_declined
--   accepted → left          → chủ nhóm: join_request (body: join_request.body_left)
create function public.trg_group_members_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row public.group_members := coalesce(new, old);
  v_group public.groups;
  v_name text;
  v_old_status public.member_status := case when tg_op = 'INSERT' then null else old.status end;
  v_new_status public.member_status := case when tg_op = 'DELETE' then null else new.status end;
  v_target uuid;
  v_type text;
  v_body text;
begin
  update public.groups g
  set seats_taken = (select count(*)::int from public.group_members m where m.group_id = g.id and m.status = 'accepted')
  where g.id = v_row.group_id
  returning * into v_group;

  if v_group.conversation_id is not null and v_old_status is distinct from v_new_status then
    if v_new_status = 'accepted' then
      insert into public.conversation_members (conversation_id, user_id)
      values (v_group.conversation_id, v_row.user_id)
      on conflict do nothing;
    elsif v_old_status = 'accepted' then
      delete from public.conversation_members
      where conversation_id = v_group.conversation_id and user_id = v_row.user_id;
    end if;
  end if;

  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and v_old_status is distinct from v_new_status) then
    if v_new_status = 'requested' then
      v_target := v_group.host_id; v_type := 'join_request'; v_body := 'join_request.body';
    elsif v_new_status = 'accepted' and v_old_status is distinct from 'requested' then
      v_target := v_group.host_id; v_type := 'join_request'; v_body := 'join_request.body_joined';
    elsif v_new_status = 'accepted' then
      v_target := v_row.user_id; v_type := 'join_accepted'; v_body := 'join_accepted.body';
    elsif v_new_status = 'declined' then
      v_target := v_row.user_id; v_type := 'join_declined'; v_body := 'join_declined.body';
    elsif v_new_status = 'left' and v_old_status = 'accepted' then
      v_target := v_group.host_id; v_type := 'join_request'; v_body := 'join_request.body_left';
    end if;
    if v_target is not null then
      select public.short_name(p.full_name) into v_name from public.profiles p where p.id = v_row.user_id;
      insert into public.notifications (user_id, type, title_key, body_key, params, data)
      select v_target, v_type, v_type || '.title', v_body,
             jsonb_build_object('name', coalesce(nullif(v_name, ''), '…'), 'title', v_group.title),
             jsonb_build_object('screen', 'group', 'params', jsonb_build_object('id', v_group.id))
      from public.profiles p
      where p.id = v_target and p.deleted_at is null;
    end if;
  end if;
  return null;
end;
$$;
revoke execute on function public.trg_group_members_sync() from public, anon, authenticated;
create trigger trg_group_members_sync after insert or update or delete on public.group_members
  for each row execute function public.trg_group_members_sync();

-- Loại thông báo mới: join_declined (bị từ chối), group_cancelled (nhóm bị huỷ) — khớp NOTIFICATION_SCREENS ở @hp/shared.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'new_message', 'join_request', 'join_accepted', 'join_declined', 'group_cancelled', 'group_reminder',
  'listing_approved', 'listing_rejected', 'listing_expiring', 'lost_found_match', 'system'
));

-- Push: thêm join_declined, group_cancelled vào nhóm 'groups' (khớp PREF_OF_TYPE ở @hp/shared notifications.ts).
create or replace function public.notification_push_enabled(p_prefs jsonb, p_type text)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select coalesce((p_prefs ->> (case
    when p_type = 'new_message' then 'messages'
    when p_type in ('listing_approved', 'listing_rejected', 'listing_expiring') then 'listings'
    when p_type in ('join_request', 'join_accepted', 'join_declined', 'group_cancelled', 'group_reminder') then 'groups'
    when p_type = 'lost_found_match' then 'lost_found'
  end))::boolean, true);
$$;

-- Realtime: groups (chủ nhóm thấy số chỗ / trạng thái đổi), group_members (chủ nhóm thấy người xin mới, người xin thấy
-- được duyệt). RLS lọc: người ngoài không nhận event.
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.group_members;

-- ═════════════════════════════════════════════════════════════════════════════
-- public_groups — trang công khai / danh sách. Không: vị trí chính xác, SĐT, họ tên đầy đủ, lời nhắn.
--   seats_left, members (≤ 8 thành viên accepted: id, name "An N.", avatar_url) cho hàng avatar.
--   Gồm cả nhóm đã đủ / đã diễn ra / đã huỷ (trang chi tiết hiện nhãn); danh sách lọc ở search_groups.
-- ═════════════════════════════════════════════════════════════════════════════
create view public.public_groups with (security_invoker = false) as
select
  g.id,
  g.slug,
  g.short_id,
  g.kind,
  g.sub_kind,
  g.status,
  g.title,
  g.description,
  g.site,
  s.name as site_name,
  g.starts_at,
  g.ends_at,
  g.seats_total,
  g.seats_taken,
  greatest(g.seats_total - g.seats_taken, 0) as seats_left,
  g.fee_per_person,
  g.origin_text,
  extensions.st_y(o.snapped)::double precision as origin_lat,
  extensions.st_x(o.snapped)::double precision as origin_lng,
  g.destination_text,
  extensions.st_y(d.snapped)::double precision as destination_lat,
  extensions.st_x(d.snapped)::double precision as destination_lng,
  g.attributes,
  g.requires_approval,
  g.lang,
  g.created_at,
  g.updated_at,
  g.host_id,
  public.short_name(p.full_name) as host_name,
  p.avatar_url as host_avatar_url,
  p.badges as host_badges,
  p.rating_avg as host_rating_avg,
  p.rating_count as host_rating_count,
  p.created_at as host_since,
  coalesce(mem.members, '[]'::jsonb) as members,
  (g.starts_at <= now()) as is_past
from public.groups g
join public.profiles p on p.id = g.host_id
left join public.sites s on s.code = g.site
left join lateral (select extensions.st_snaptogrid(g.origin::extensions.geometry, 0.003) as snapped) o on true
left join lateral (select extensions.st_snaptogrid(g.destination::extensions.geometry, 0.003) as snapped) d on true
left join lateral (
  select jsonb_agg(jsonb_build_object('id', x.user_id, 'name', x.name, 'avatar_url', x.avatar_url) order by x.joined_at) as members
  from (
    select m.user_id, public.short_name(mp.full_name) as name, mp.avatar_url, m.joined_at
    from public.group_members m
    join public.profiles mp on mp.id = m.user_id and mp.deleted_at is null
    where m.group_id = g.id and m.status = 'accepted'
    order by m.joined_at
    limit 8
  ) x
) mem on true
where g.deleted_at is null
  and p.deleted_at is null
  and not p.is_banned
  and (p.banned_until is null or p.banned_until <= now())
  and not public.is_blocked(g.host_id, (select auth.uid()));
comment on view public.public_groups is
  'Nhóm công khai (mọi trạng thái trừ đã xoá; ẩn khi chặn hai chiều). Vị trí làm tròn ~300 m, tên "An N.". '
  'Không thêm cột nhạy cảm.';
grant select on public.public_groups to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- search_groups — nhóm sắp diễn ra (open; p_include_full thêm full), sớm nhất trước.
-- Cursor 2 cột (starts_at, id) vì nhiều nhóm trùng giờ. p_from / p_to: khoảng giờ (vd "hôm nay").
-- p_query: không dấu, khớp tiêu đề / điểm đi / điểm đến / sân. Bán kính điểm đi (p_lat/p_lng) và điểm đến (p_dest_*).
-- ═════════════════════════════════════════════════════════════════════════════
create function public.search_groups(
  p_kind public.group_kind,
  p_sub_kinds text[] default null,
  p_site text default null,
  p_query text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m int default 10000,
  p_dest_lat double precision default null,
  p_dest_lng double precision default null,
  p_dest_radius_m int default 20000,
  p_include_full boolean default false,
  p_limit int default 20,
  p_cursor_starts_at timestamptz default null,
  p_cursor_id uuid default null
)
returns setof public.public_groups
language sql stable security invoker set search_path = '' as $$
  with q as (
    select nullif(public.f_unaccent(lower(left(btrim(coalesce(p_query, '')), 100))), '') as text
  )
  select v.*
  from public.public_groups v, q
  where v.kind = p_kind
    and (v.status = 'open' or (p_include_full and v.status = 'full'))
    and v.starts_at > now()
    and (p_sub_kinds is null or cardinality(p_sub_kinds) = 0 or v.sub_kind = any (p_sub_kinds))
    and (p_site is null or v.site = p_site)
    and (p_from is null or v.starts_at >= p_from)
    and (p_to is null or v.starts_at < p_to)
    and (q.text is null
         or public.f_unaccent(lower(v.title || ' ' || v.origin_text || ' ' || coalesce(v.destination_text, '')))
            like '%' || replace(replace(replace(q.text, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    and (p_lat is null or p_lng is null or v.origin_lat is null
         or extensions.st_dwithin(
              extensions.st_setsrid(extensions.st_makepoint(v.origin_lng, v.origin_lat), 4326)::extensions.geography,
              extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
              least(greatest(coalesce(p_radius_m, 10000), 100), 100000)))
    and (p_dest_lat is null or p_dest_lng is null
         or (v.destination_lat is not null and extensions.st_dwithin(
              extensions.st_setsrid(extensions.st_makepoint(v.destination_lng, v.destination_lat), 4326)::extensions.geography,
              extensions.st_setsrid(extensions.st_makepoint(p_dest_lng, p_dest_lat), 4326)::extensions.geography,
              least(greatest(coalesce(p_dest_radius_m, 20000), 100), 100000))))
    and (p_cursor_starts_at is null
         or (v.starts_at, v.id) > (p_cursor_starts_at, coalesce(p_cursor_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  order by v.starts_at, v.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
comment on function public.search_groups(public.group_kind, text[], text, text, timestamptz, timestamptz, double precision,
  double precision, int, double precision, double precision, int, boolean, int, timestamptz, uuid) is
  'Danh sách nhóm sắp diễn ra (anon được). Cursor (starts_at, id) của dòng cuối.';
revoke execute on function public.search_groups(public.group_kind, text[], text, text, timestamptz, timestamptz,
  double precision, double precision, int, double precision, double precision, int, boolean, int, timestamptz, uuid) from public;
grant execute on function public.search_groups(public.group_kind, text[], text, text, timestamptz, timestamptz,
  double precision, double precision, int, double precision, double precision, int, boolean, int, timestamptz, uuid) to anon, authenticated;

create function public.get_group_by_slug(p_slug text)
returns setof public.public_groups
language sql stable security invoker set search_path = '' as $$
  select v.*
  from public.public_groups v
  where v.short_id = substring(lower(coalesce(p_slug, '')) from '([0-9a-z]{6})$')
  limit 1;
$$;
comment on function public.get_group_by_slug(text) is 'Chi tiết nhóm công khai theo slug (khớp short_id 6 ký tự cuối). Không thấy → 0 dòng.';
revoke execute on function public.get_group_by_slug(text) from public;
grant execute on function public.get_group_by_slug(text) to anon, authenticated;

-- Thành viên một nhóm theo quyền xem (RLS group_members): chủ nhóm thấy mọi trạng thái + lời nhắn,
-- thành viên accepted thấy nhau, người xin thấy dòng mình. Tên "An N." qua public_profiles.
create function public.list_group_members(p_group_id uuid)
returns table (
  user_id uuid,
  status public.member_status,
  note text,
  joined_at timestamptz,
  responded_at timestamptz,
  display_name text,
  avatar_url text,
  badges text[],
  rating_avg numeric,
  rating_count int
)
language sql stable security invoker set search_path = '' as $$
  select m.user_id, m.status, m.note, m.joined_at, m.responded_at,
         pp.display_name, pp.avatar_url, pp.badges, pp.rating_avg, pp.rating_count
  from public.group_members m
  left join public.public_profiles pp on pp.id = m.user_id
  where m.group_id = p_group_id
  order by (m.status = 'requested') desc, m.joined_at;
$$;
revoke execute on function public.list_group_members(uuid) from public, anon;
grant execute on function public.list_group_members(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- RPC ghi (definer, khoá dòng nhóm). Gọi từ Edge Function join-group / respond-join; leave_group gọi thẳng.
-- Lỗi P0001: auth_required, banned, not_found, cannot_join_own, blocked, group_closed, group_full, already_joined,
--   join_declined, message_has_phone, message_profanity, rate_limited, forbidden.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.join_group_tx(p_group_id uuid, p_note text default null)
returns public.member_status language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_group public.groups;
  v_current public.member_status;
  v_status public.member_status;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_violation text;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if public.is_banned() then
    raise exception using errcode = 'P0001', message = 'banned';
  end if;
  select g.* into v_group
  from public.groups g join public.profiles p on p.id = g.host_id
  where g.id = p_group_id and g.deleted_at is null and p.deleted_at is null and not p.is_banned
  for update of g;
  if v_group.id is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_group.host_id = v_uid then
    raise exception using errcode = 'P0001', message = 'cannot_join_own';
  end if;
  if public.is_blocked(v_uid, v_group.host_id) then
    raise exception using errcode = 'P0001', message = 'blocked';
  end if;
  if v_group.status not in ('open', 'full') or v_group.starts_at <= now() then
    raise exception using errcode = 'P0001', message = 'group_closed';
  end if;

  select status into v_current from public.group_members where group_id = p_group_id and user_id = v_uid;
  if v_current in ('requested', 'accepted') then
    raise exception using errcode = 'P0001', message = 'already_joined';
  end if;
  if v_current in ('declined', 'kicked') then
    raise exception using errcode = 'P0001', message = 'join_declined';
  end if;
  if not v_group.requires_approval and v_group.seats_taken >= v_group.seats_total then
    raise exception using errcode = 'P0001', message = 'group_full';
  end if;
  if v_group.requires_approval and v_group.status = 'full' then
    raise exception using errcode = 'P0001', message = 'group_full';
  end if;
  if char_length(v_note) > 200 then
    raise exception using errcode = 'P0001', message = 'invalid_input';
  end if;
  v_violation := public.chat_message_violation(v_note);
  if v_violation is not null then
    raise exception using errcode = 'P0001', message = v_violation;
  end if;
  perform public.assert_rate_limit(v_uid::text, 'join_group', 20, 3600);   -- RATE_LIMITS.groupJoinsPerHour

  v_status := case when v_group.requires_approval then 'requested' else 'accepted' end;
  insert into public.group_members (group_id, user_id, status, note, joined_at, responded_at)
  values (p_group_id, v_uid, v_status, v_note, now(), null)
  on conflict (group_id, user_id) do update
    set status = excluded.status, note = excluded.note, joined_at = excluded.joined_at, responded_at = null;
  return v_status;
end;
$$;
comment on function public.join_group_tx(uuid, text) is
  'Xin / tham gia nhóm trong một transaction (khoá dòng nhóm). Trả requested | accepted. Gọi qua Edge Function join-group.';
revoke execute on function public.join_group_tx(uuid, text) from public, anon;
grant execute on function public.join_group_tx(uuid, text) to authenticated;

create function public.respond_join_tx(p_group_id uuid, p_user_id uuid, p_accept boolean)
returns public.member_status language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_group public.groups;
  v_current public.member_status;
  v_status public.member_status := case when p_accept then 'accepted' else 'declined' end;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if public.is_banned() then
    raise exception using errcode = 'P0001', message = 'banned';
  end if;
  select * into v_group from public.groups where id = p_group_id and deleted_at is null for update;
  if v_group.id is null or v_group.host_id <> v_uid then
    raise exception using errcode = 'P0001', message = 'forbidden';
  end if;
  if v_group.status not in ('open', 'full') or v_group.starts_at <= now() then
    raise exception using errcode = 'P0001', message = 'group_closed';
  end if;
  select status into v_current from public.group_members where group_id = p_group_id and user_id = p_user_id for update;
  if v_current is distinct from 'requested' then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if p_accept and v_group.seats_taken >= v_group.seats_total then
    raise exception using errcode = 'P0001', message = 'group_full';
  end if;
  update public.group_members set status = v_status, responded_at = now()
  where group_id = p_group_id and user_id = p_user_id;
  return v_status;
end;
$$;
comment on function public.respond_join_tx(uuid, uuid, boolean) is
  'Chủ nhóm duyệt / từ chối người xin (khoá dòng nhóm). Gọi qua Edge Function respond-join.';
revoke execute on function public.respond_join_tx(uuid, uuid, boolean) from public, anon;
grant execute on function public.respond_join_tx(uuid, uuid, boolean) to authenticated;

-- Rời nhóm / rút yêu cầu: requested | accepted → left (nhả chỗ, rời chat nhóm). Chủ nhóm huỷ nhóm thay vì rời.
create function public.leave_group(p_group_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_host uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  select host_id into v_host from public.groups where id = p_group_id for update;
  if v_host = v_uid then
    raise exception using errcode = 'P0001', message = 'host_cannot_leave';
  end if;
  update public.group_members set status = 'left'
  where group_id = p_group_id and user_id = v_uid and status in ('requested', 'accepted');
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
end;
$$;
comment on function public.leave_group(uuid) is 'Rời nhóm / rút yêu cầu tham gia.';
revoke execute on function public.leave_group(uuid) from public, anon;
grant execute on function public.leave_group(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Chat: hộp thư 1-1 vẫn chỉ hiện hội thoại direct cho tới khi app / web có màn chat nhóm (tuần 8).
-- (list_conversations / count_unread_conversations giữ nguyên — chưa ai gửi được tin vào chat nhóm từ UI.)
-- ═════════════════════════════════════════════════════════════════════════════
