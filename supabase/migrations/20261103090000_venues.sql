-- Danh mục sân thể thao (venues) + gắn sân vào nhóm Ghép trận — tuần 8
-- Mục đích: người tạo kèo chọn sân có sẵn (vị trí, môn, giá tham khảo, SĐT sân) thay vì gõ tay; người dùng đóng góp sân
--   mới (chờ duyệt), moderator duyệt / từ chối (ghi audit_log). Sân đã duyệt công khai cho anon (trang web, chọn sân).
-- Bảng: venues (mới), groups (+ venue_id, reminded_at). View: public_groups thêm venue_id, venue_name, venue_address
--   (cột thêm ở cuối). RPC: search_venues (anon được).
-- Client: @hp/core venues.ts + hooks (useVenues, useContributeVenue); Zod @hp/shared schemas/venue; form sport chọn sân;
--   type sinh lại ở packages/db.
--
-- Thiết kế
-- - SĐT sân là số liên hệ của cơ sở kinh doanh (không phải PII người dùng) → công khai khi đã duyệt. Người đóng góp
--   (created_by) không lộ ra ngoài.
-- - Chọn sân cho nhóm: chỉ sân approved, môn của sân phải gồm sub_kind của nhóm; origin của nhóm lấy theo vị trí sân
--   (public_groups vẫn làm tròn ~300 m như mọi nhóm). origin_text vẫn là chữ client gửi (tên sân / ghi chú).
-- - reminded_at: cron remind_groups (migration sau) đánh dấu đã nhắc; đổi giờ diễn ra → reset để nhắc lại.
--
-- Ma trận quyền
-- | Vai trò   | venues                                              | search_venues |
-- |-----------|-----------------------------------------------------|---------------|
-- | anon      | đọc approved                                        | có            |
-- | user      | đọc approved + sân mình góp; góp sân (pending, 5/ngày)| có            |
-- | bị cấm    | đọc approved + của mình; không góp                  | có            |
-- | moderator | đọc tất cả; duyệt / từ chối / sửa / ẩn (audit)      | có            |
--
-- Explain (seed 8 sân): search_venues quét venues_status_site_idx; số sân mỗi khu nhỏ (< 200) nên đủ.

-- ═════════════════════════════════════════════════════════════════════════════
-- venues
-- ═════════════════════════════════════════════════════════════════════════════
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  sports text[] not null check (cardinality(sports) between 1 and 3
                                and sports <@ array['football', 'badminton', 'pickleball']),
  site text references public.sites (code),
  address_text text check (char_length(address_text) <= 200),
  location extensions.geography(point, 4326),
  price_ref numeric(14, 0) check (price_ref between 0 and 100000000),   -- VND / giờ, tham khảo
  phone text check (phone ~ '^\+?[0-9][0-9 .]{7,14}$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text check (char_length(reject_reason) <= 200),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on table public.venues is 'Sân thể thao cho Ghép trận. Người dùng góp (pending), moderator duyệt. Approved công khai.';
comment on column public.venues.sports is 'Môn của sân — khớp GROUP_SUB_KINDS.sport ở @hp/shared.';
comment on column public.venues.price_ref is 'Giá tham khảo VND / giờ (không ràng buộc).';
create index venues_status_site_idx on public.venues (status, site, name) where deleted_at is null;
create index venues_location_idx on public.venues using gist (location);
create index venues_created_by_idx on public.venues (created_by, created_at desc);
alter table public.venues enable row level security;
grant select on public.venues to anon, authenticated;
grant insert (name, sports, site, address_text, location, price_ref, phone) on public.venues to authenticated;
grant update (name, sports, site, address_text, location, price_ref, phone, status, reject_reason, deleted_at)
  on public.venues to authenticated;   -- policy: chỉ staff
create trigger trg_venues_updated_at before update on public.venues
  for each row execute function public.set_updated_at();

create policy venues_select_public on public.venues for select to anon, authenticated
  using (status = 'approved' and deleted_at is null);
create policy venues_select_own_or_staff on public.venues for select to authenticated
  using (created_by = (select auth.uid()) or (select public.is_staff()));
create policy venues_insert_own on public.venues for insert to authenticated
  with check (created_by = (select auth.uid()) and not (select public.is_banned()));
create policy venues_update_staff on public.venues for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- guard (definer: assert_rate_limit, audit_log). Client góp: luôn pending, 5 sân / 24h, khu mặc định theo hồ sơ.
-- Staff đổi trạng thái → reviewed_by / reviewed_at + audit venue.approve | venue.reject | venue.update | venue.hide.
create function public.trg_venues_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_client boolean := coalesce(current_setting('role', true), 'none') in ('anon', 'authenticated');
  v_action text;
begin
  new.name := btrim(new.name);
  new.address_text := nullif(btrim(new.address_text), '');
  new.phone := nullif(btrim(new.phone), '');
  select array_agg(distinct s order by s) into new.sports from unnest(new.sports) s;

  if tg_op = 'INSERT' then
    if v_client then
      new.status := 'pending';
      new.reject_reason := null;
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.deleted_at := null;
      perform public.assert_rate_limit(new.created_by::text, 'venue_contribute', 5, 86400);   -- RATE_LIMITS.venuesPerDay
      if new.site is null then
        select site into new.site from public.profiles where id = new.created_by;
      end if;
    end if;
    return new;
  end if;

  if new.created_by is distinct from old.created_by then
    raise exception using errcode = '42501', message = 'forbidden', detail = 'venues: không đổi người góp';
  end if;
  if v_client then
    if new.status is distinct from old.status then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
      v_action := case new.status when 'approved' then 'venue.approve' when 'rejected' then 'venue.reject' else 'venue.update' end;
    elsif new.deleted_at is distinct from old.deleted_at then
      v_action := 'venue.hide';
    else
      v_action := 'venue.update';
    end if;
    insert into public.audit_log (actor_id, action, target_type, target_id, meta)
    values (auth.uid(), v_action, 'venue', new.id::text,
            jsonb_build_object('from', old.status, 'to', new.status, 'reason', new.reject_reason));
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_venues_guard() from public, anon, authenticated;
create trigger trg_venues_guard before insert or update on public.venues
  for each row execute function public.trg_venues_guard();

-- ═════════════════════════════════════════════════════════════════════════════
-- search_venues — sân đã duyệt theo môn / khu / chữ; có toạ độ thì gần nhất trước, không thì theo tên.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.search_venues(
  p_sport text default null,
  p_site text default null,
  p_query text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit int default 30
)
returns table (
  id uuid,
  name text,
  sports text[],
  site text,
  address_text text,
  lat double precision,
  lng double precision,
  price_ref numeric,
  phone text,
  distance_m double precision
)
language sql stable security invoker set search_path = '' as $$
  with q as (
    select nullif(public.f_unaccent(lower(left(btrim(coalesce(p_query, '')), 100))), '') as text,
           case when p_lat is not null and p_lng is not null
                then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography end as here
  )
  select v.id, v.name, v.sports, v.site, v.address_text,
         extensions.st_y(v.location::extensions.geometry)::double precision,
         extensions.st_x(v.location::extensions.geometry)::double precision,
         v.price_ref, v.phone,
         case when q.here is not null and v.location is not null then extensions.st_distance(v.location, q.here) end
  from public.venues v, q
  where v.status = 'approved' and v.deleted_at is null
    and (p_sport is null or p_sport = any (v.sports))
    and (p_site is null or v.site = p_site)
    and (q.text is null
         or public.f_unaccent(lower(v.name || ' ' || coalesce(v.address_text, '')))
            like '%' || replace(replace(replace(q.text, '\', '\\'), '%', '\%'), '_', '\_') || '%')
  order by case when q.here is not null and v.location is not null then extensions.st_distance(v.location, q.here) end
           nulls last, v.name
  limit least(greatest(coalesce(p_limit, 30), 1), 50);
$$;
comment on function public.search_venues(text, text, text, double precision, double precision, int) is
  'Sân đã duyệt (anon được). Có p_lat / p_lng → gần nhất trước.';
revoke execute on function public.search_venues(text, text, text, double precision, double precision, int) from public;
grant execute on function public.search_venues(text, text, text, double precision, double precision, int) to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- groups.venue_id, groups.reminded_at
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.groups add column venue_id uuid references public.venues (id) on delete set null;
alter table public.groups add column reminded_at timestamptz;
comment on column public.groups.venue_id is 'Ghép trận: sân trong danh mục venues (approved, đúng môn). origin lấy theo sân.';
comment on column public.groups.reminded_at is 'Đã gửi group_reminder (cron remind_groups). Đổi starts_at → null.';
create index groups_venue_idx on public.groups (venue_id) where venue_id is not null;
create index groups_remind_idx on public.groups (starts_at) where reminded_at is null and status in ('open', 'full');
grant update (venue_id) on public.groups to authenticated;

-- Chạy sau trg_groups_guard / identity / open_chat / updated_at (thứ tự tên). Invoker: đọc sân qua RLS (approved).
create function public.trg_groups_venue_schedule()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_venue record;
begin
  if new.venue_id is not null and (tg_op = 'INSERT' or new.venue_id is distinct from old.venue_id) then
    select v.location, v.sports into v_venue
    from public.venues v
    where v.id = new.venue_id and v.status = 'approved' and v.deleted_at is null;
    if not found or new.kind <> 'sport' or not (new.sub_kind = any (v_venue.sports)) then
      raise exception using errcode = 'P0001', message = 'invalid_venue';
    end if;
    if v_venue.location is not null then
      new.origin := v_venue.location;
    end if;
  end if;
  if tg_op = 'UPDATE' and new.starts_at is distinct from old.starts_at then
    new.reminded_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_groups_venue_schedule() from public, anon, authenticated;
create trigger trg_groups_venue_schedule before insert or update on public.groups
  for each row execute function public.trg_groups_venue_schedule();

-- ═════════════════════════════════════════════════════════════════════════════
-- public_groups: thêm venue_id, venue_name, venue_address (ở cuối — create or replace view chỉ cho thêm cột cuối).
-- ═════════════════════════════════════════════════════════════════════════════
create or replace view public.public_groups with (security_invoker = false) as
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
  (g.starts_at <= now()) as is_past,
  g.venue_id,
  vn.name as venue_name,
  vn.address_text as venue_address
from public.groups g
join public.profiles p on p.id = g.host_id
left join public.sites s on s.code = g.site
left join public.venues vn on vn.id = g.venue_id and vn.status = 'approved' and vn.deleted_at is null
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
