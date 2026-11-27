-- Gọi thợ: người cần đăng yêu cầu → nhiều thợ báo giá → chọn một báo giá → chat → hoàn thành → đánh giá hai chiều.
-- Mục đích: mẫu dữ liệu thứ ba (không phải Listing / Group) cho mini-app `goiTho` (điện nước, vệ sinh, thợ hàn, thợ điện lạnh, khác).
-- Bảng: service_requests, service_quotes. View: public_service_requests (anon + authenticated), my_service_requests,
--   my_service_quotes. Bucket công khai request-images. Mở rộng: notifications_type_check, ratings.context_type,
--   reports.target_type (+ chặn tự báo cáo), delete_my_account(), admin_stats().
-- RPC: search_service_requests, get_service_request (anon được, invoker); get_service_request_private, list_request_quotes
--   (invoker, RLS quyết định); submit_quote_tx, withdraw_quote, cancel_request, complete_request_tx, rate_service_request,
--   staff_cancel_request (definer); expire_service_requests (cron). accept_quote_tx + chat ở migration kế tiếp.
-- Client: @hp/core service-requests.ts + hooks; Zod @hp/shared schemas/service-request; type sinh lại ở packages/db.
--
-- Thiết kế
-- - Bảng gốc chỉ chủ yêu cầu + staff + thợ ĐÃ ĐƯỢC CHỌN đọc (địa chỉ + toạ độ chính xác chỉ ba bên này thấy, qua
--   get_service_request_private). Mọi người khác đọc view công khai: toạ độ làm tròn lưới 0.003° (~300 m), không địa chỉ.
-- - Trạng thái / số báo giá / báo giá được chọn chỉ đổi qua RPC definer (khoá dòng yêu cầu để không chọn hai báo giá).
--   Client chỉ tạo yêu cầu (open) và sửa nội dung khi chưa có báo giá nào.
-- - Ai đăng nhập cũng báo giá được (không cần huy hiệu): rate limit 20 báo giá / giờ, lọc SĐT / từ cấm trong ghi chú,
--   báo cáo + staff huỷ. Chat giữa chủ yêu cầu và thợ chỉ mở khi thợ có báo giá chưa rút (migration chat).
-- - Yêu cầu hết hạn sau 7 ngày (cron expire-service-requests mỗi giờ); báo giá khác bị từ chối khi chọn / huỷ / hết hạn.
--
-- Ma trận quyền
-- | Vai trò   | service_requests (bảng gốc)      | service_quotes            | view public_service_requests | RPC ghi                         |
-- |-----------|----------------------------------|---------------------------|------------------------------|---------------------------------|
-- | anon      | –                                | –                         | đọc (ẩn khi chặn)            | –                               |
-- | user      | tạo (5 / 24h), chủ đọc / sửa     | thợ đọc của mình; chủ     | đọc                          | submit / withdraw (thợ);        |
-- |           | khi chưa có báo giá; thợ được    | yêu cầu đọc của yêu cầu   |                              | cancel / complete / rate (chủ)  |
-- |           | chọn đọc                         |                           |                              |                                 |
-- | bị cấm    | chủ đọc, không tạo / sửa         | như user (đọc)            | đọc                          | không (banned)                  |
-- | moderator | đọc tất cả                       | đọc tất cả                | đọc                          | staff_cancel_request            |
--
-- Explain (seed): search_service_requests dùng service_requests_open_idx (status, trade, created_at desc) partial;
--   my_* dùng service_requests_customer_idx / service_quotes_pro_idx; quotes_count đếm trên service_quotes_request_idx.

-- ═════════════════════════════════════════════════════════════════════════════
-- Enum
-- ═════════════════════════════════════════════════════════════════════════════
create type public.service_trade as enum ('electric_plumbing', 'cleaning', 'welding', 'hvac', 'other');
create type public.service_request_status as enum ('open', 'assigned', 'completed', 'cancelled', 'expired');
create type public.service_quote_status as enum ('submitted', 'accepted', 'declined', 'withdrawn');
create type public.service_urgency as enum ('today', 'this_week', 'flexible');

-- ═════════════════════════════════════════════════════════════════════════════
-- service_requests
-- ═════════════════════════════════════════════════════════════════════════════
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  trade public.service_trade not null,
  title text not null check (char_length(btrim(title)) between 5 and 120),
  description text check (char_length(description) <= 2000),
  images text[] not null default '{}' check (cardinality(images) <= 4),   -- path trong bucket request-images
  site text references public.sites (code),
  location extensions.geography(point, 4326),                              -- chính xác: chỉ chủ + thợ được chọn + staff
  address_text text check (char_length(btrim(address_text)) between 2 and 200),
  budget_min numeric(14, 0) check (budget_min between 0 and 1000000000),
  budget_max numeric(14, 0) check (budget_max between 0 and 1000000000),
  urgency public.service_urgency not null default 'flexible',
  status public.service_request_status not null default 'open',
  accepted_quote_id uuid,                                                  -- FK thêm sau khi có service_quotes
  quotes_count int not null default 0 check (quotes_count >= 0),
  expires_at timestamptz not null default now() + interval '7 days',
  completed_at timestamptz,
  lang text not null default 'vi' check (lang in ('vi', 'en', 'zh')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (budget_max is null or budget_min is null or budget_max >= budget_min)
);
comment on table public.service_requests is 'Yêu cầu gọi thợ. Công khai qua public_service_requests; bảng gốc chỉ chủ + staff + thợ được chọn.';
comment on column public.service_requests.quotes_count is 'Số báo giá chưa rút — trigger trg_service_quotes_count đếm, client không ghi.';
comment on column public.service_requests.address_text is 'Địa chỉ chính xác — riêng tư (chủ, thợ được chọn, staff).';
create index service_requests_open_idx on public.service_requests (status, trade, created_at desc) where deleted_at is null;
create index service_requests_customer_idx on public.service_requests (customer_id, created_at desc);
create index service_requests_site_idx on public.service_requests (site) where deleted_at is null;
create index service_requests_location_idx on public.service_requests using gist (location);
alter table public.service_requests enable row level security;
grant select, insert on public.service_requests to authenticated;
grant update (title, description, images, address_text, location, budget_min, budget_max, urgency) on public.service_requests to authenticated;
create trigger trg_service_requests_updated_at before update on public.service_requests
  for each row execute function public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- service_quotes — chỉ ghi qua RPC submit_quote_tx / withdraw_quote / accept_quote_tx
-- ═════════════════════════════════════════════════════════════════════════════
create table public.service_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  pro_id uuid not null references public.profiles (id) on delete cascade,
  price numeric(14, 0) not null check (price between 1000 and 1000000000),
  available_at timestamptz,
  note text check (char_length(note) <= 500),
  status public.service_quote_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, pro_id)
);
comment on table public.service_quotes is 'Báo giá của thợ cho một yêu cầu (một báo giá / thợ). Chỉ ghi qua RPC.';
create index service_quotes_request_idx on public.service_quotes (request_id, status);
create index service_quotes_pro_idx on public.service_quotes (pro_id, created_at desc);
alter table public.service_quotes enable row level security;
grant select on public.service_quotes to authenticated;
create trigger trg_service_quotes_updated_at before update on public.service_quotes
  for each row execute function public.set_updated_at();

alter table public.service_requests add constraint service_requests_accepted_quote_fkey
  foreign key (accepted_quote_id) references public.service_quotes (id) on delete set null;

-- ═════════════════════════════════════════════════════════════════════════════
-- Helper RLS (definer: tránh đệ quy policy giữa hai bảng)
-- ═════════════════════════════════════════════════════════════════════════════
create function public.is_request_customer(p_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.service_requests where id = p_request_id and customer_id = (select auth.uid()));
$$;
comment on function public.is_request_customer(uuid) is 'Người gọi là chủ yêu cầu.';
grant execute on function public.is_request_customer(uuid) to authenticated;

create function public.is_accepted_pro(p_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.service_requests r join public.service_quotes q on q.id = r.accepted_quote_id
    where r.id = p_request_id and q.pro_id = (select auth.uid()) and r.status in ('assigned', 'completed')
  );
$$;
comment on function public.is_accepted_pro(uuid) is 'Người gọi là thợ đã được chọn cho yêu cầu (assigned / completed).';
grant execute on function public.is_accepted_pro(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Policy
-- ═════════════════════════════════════════════════════════════════════════════
create policy service_requests_select_party on public.service_requests for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_staff()) or public.is_accepted_pro(id));
create policy service_requests_insert_own on public.service_requests for insert to authenticated
  with check (customer_id = (select auth.uid()) and not (select public.is_banned()));
create policy service_requests_update_own on public.service_requests for update to authenticated
  using (customer_id = (select auth.uid()) and deleted_at is null)
  with check (customer_id = (select auth.uid()) and not (select public.is_banned()));

create policy service_quotes_select_party on public.service_quotes for select to authenticated
  using (pro_id = (select auth.uid()) or public.is_request_customer(request_id) or (select public.is_staff()));

-- ═════════════════════════════════════════════════════════════════════════════
-- Trigger service_requests
-- ═════════════════════════════════════════════════════════════════════════════
-- guard (invoker: current_user = vai trò thật; RPC definer chạy bằng chủ hàm nên bỏ qua). Client: tạo yêu cầu open,
-- ảnh nằm trong thư mục của mình; sửa: chỉ khi còn open và chưa có báo giá.
create function public.trg_service_requests_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.status <> 'open' or new.accepted_quote_id is not null or new.quotes_count <> 0
         or new.deleted_at is not null or new.completed_at is not null then
        raise exception using errcode = '42501', message = 'forbidden', detail = 'service_requests: cột chỉ server đặt';
      end if;
      new.expires_at := now() + interval '7 days';   -- SERVICE_REQUEST_RULES.expireDays
    else
      if new.customer_id is distinct from old.customer_id or new.trade is distinct from old.trade
         or new.site is distinct from old.site or new.status is distinct from old.status
         or new.accepted_quote_id is distinct from old.accepted_quote_id or new.quotes_count is distinct from old.quotes_count
         or new.expires_at is distinct from old.expires_at or new.completed_at is distinct from old.completed_at
         or new.deleted_at is distinct from old.deleted_at or new.lang is distinct from old.lang then
        raise exception using errcode = '42501', message = 'forbidden', detail = 'service_requests: cột không sửa được';
      end if;
      if old.status <> 'open' then
        raise exception using errcode = 'P0001', message = 'request_closed';
      end if;
      if old.quotes_count > 0
         and (new.title, new.description, new.images, new.budget_min, new.budget_max, new.urgency)
             is distinct from (old.title, old.description, old.images, old.budget_min, old.budget_max, old.urgency) then
        raise exception using errcode = 'P0001', message = 'request_has_quotes';
      end if;
    end if;
    if exists (select 1 from unnest(new.images) i where i not like new.customer_id::text || '/%') then
      raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'service_requests: ảnh phải nằm trong thư mục của chủ yêu cầu';
    end if;
  end if;

  new.title := btrim(new.title);
  new.description := nullif(btrim(new.description), '');
  new.address_text := nullif(btrim(new.address_text), '');
  return new;
end;
$$;
revoke execute on function public.trg_service_requests_guard() from public, anon, authenticated;
create trigger trg_service_requests_guard before insert or update on public.service_requests
  for each row execute function public.trg_service_requests_guard();

-- limits (definer, chạy sau guard theo thứ tự tên): 5 yêu cầu / ngày, lọc SĐT / từ cấm trong tiêu đề + mô tả, khu mặc
-- định theo hồ sơ. Điều kiện theo `role` (vai trò phiên) để RPC definer không bị tính rate limit tạo mới.
create function public.trg_service_requests_limits()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_violation text;
begin
  if coalesce(current_setting('role', true), 'none') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      perform public.assert_rate_limit(new.customer_id::text, 'create_service_request', 5, 86400);   -- RATE_LIMITS.serviceRequestsPerDay
    end if;
    if tg_op = 'INSERT' or (new.title, new.description) is distinct from (old.title, old.description) then
      v_violation := coalesce(public.chat_message_violation(new.title), public.chat_message_violation(new.description));
      if v_violation is not null then
        raise exception using errcode = 'P0001', message = v_violation, detail = 'service_requests: nội dung bị chặn';
      end if;
    end if;
  end if;
  if tg_op = 'INSERT' and new.site is null then
    select site into new.site from public.profiles where id = new.customer_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_service_requests_limits() from public, anon, authenticated;
create trigger trg_service_requests_limits before insert or update on public.service_requests
  for each row execute function public.trg_service_requests_limits();

-- Đếm báo giá chưa rút → service_requests.quotes_count
create function public.trg_service_quotes_count()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_request uuid := coalesce(new.request_id, old.request_id);
begin
  update public.service_requests r
  set quotes_count = (select count(*)::int from public.service_quotes q where q.request_id = v_request and q.status <> 'withdrawn')
  where r.id = v_request;
  return null;
end;
$$;
revoke execute on function public.trg_service_quotes_count() from public, anon, authenticated;
create trigger trg_service_quotes_count after insert or update of status or delete on public.service_quotes
  for each row execute function public.trg_service_quotes_count();

-- ═════════════════════════════════════════════════════════════════════════════
-- Views
-- ═════════════════════════════════════════════════════════════════════════════
-- public_service_requests: yêu cầu công khai. Toạ độ làm tròn ~300 m, không địa chỉ, tên "An N.". Yêu cầu đã huỷ chỉ
-- chủ / staff / thợ từng báo giá thấy. Ẩn khi chặn hai chiều.
create view public.public_service_requests with (security_invoker = false) as
select
  r.id,
  r.trade,
  r.status,
  r.title,
  r.description,
  r.images,
  r.site,
  s.name as site_name,
  extensions.st_y(l.snapped)::double precision as lat,
  extensions.st_x(l.snapped)::double precision as lng,
  r.budget_min,
  r.budget_max,
  r.urgency,
  r.quotes_count,
  r.expires_at,
  r.completed_at,
  r.lang,
  r.created_at,
  r.updated_at,
  r.customer_id,
  public.short_name(p.full_name) as customer_name,
  p.avatar_url as customer_avatar_url,
  p.rating_avg as customer_rating_avg,
  p.rating_count as customer_rating_count,
  p.created_at as customer_since,
  aq.pro_id as accepted_pro_id
from public.service_requests r
join public.profiles p on p.id = r.customer_id
left join public.sites s on s.code = r.site
left join public.service_quotes aq on aq.id = r.accepted_quote_id
left join lateral (select extensions.st_snaptogrid(r.location::extensions.geometry, 0.003) as snapped) l on true
where r.deleted_at is null
  and p.deleted_at is null
  and not p.is_banned
  and (p.banned_until is null or p.banned_until <= now())
  and not public.is_blocked(r.customer_id, (select auth.uid()))
  and (r.status <> 'cancelled'
       or r.customer_id = (select auth.uid())
       or (select public.is_staff())
       or exists (select 1 from public.service_quotes q where q.request_id = r.id and q.pro_id = (select auth.uid())));
comment on view public.public_service_requests is
  'Yêu cầu gọi thợ công khai (mọi trạng thái trừ đã xoá; ẩn khi chặn hai chiều). Vị trí làm tròn ~300 m, không địa chỉ, '
  'tên "An N.". Không thêm cột nhạy cảm.';
grant select on public.public_service_requests to anon, authenticated;

-- Yêu cầu của tôi (chủ) + điểm tôi đã chấm thợ.
create view public.my_service_requests with (security_invoker = true) as
select v.*, r.score as my_rating
from public.public_service_requests v
left join public.ratings r on r.context_type = 'service_request' and r.context_id = v.id and r.rater_id = (select auth.uid())
where v.customer_id = (select auth.uid());
comment on view public.my_service_requests is 'Yêu cầu do người gọi đăng, kèm điểm đã chấm (my_rating).';
grant select on public.my_service_requests to authenticated;

-- Báo giá của tôi (thợ) kèm tóm tắt yêu cầu + điểm tôi đã chấm khách.
create view public.my_service_quotes with (security_invoker = true) as
select
  q.id as quote_id,
  q.price,
  q.available_at,
  q.note,
  q.status as quote_status,
  q.created_at as quoted_at,
  v.id as request_id,
  v.trade,
  v.title,
  v.status as request_status,
  v.site_name,
  v.images,
  v.customer_id,
  v.customer_name,
  v.created_at as request_created_at,
  r.score as my_rating
from public.service_quotes q
join public.public_service_requests v on v.id = q.request_id
left join public.ratings r on r.context_type = 'service_request' and r.context_id = v.id and r.rater_id = (select auth.uid())
where q.pro_id = (select auth.uid());
comment on view public.my_service_quotes is 'Báo giá do người gọi gửi, kèm tóm tắt yêu cầu và điểm đã chấm khách.';
grant select on public.my_service_quotes to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- RPC đọc
-- ═════════════════════════════════════════════════════════════════════════════
-- Danh sách yêu cầu đang mở (chưa hết hạn), mới nhất trước. Cursor 2 cột (created_at, id).
create function public.search_service_requests(
  p_trade public.service_trade default null,
  p_site text default null,
  p_query text default null,
  p_urgency public.service_urgency default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m int default 20000,
  p_limit int default 20,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns setof public.public_service_requests
language sql stable security invoker set search_path = '' as $$
  with q as (
    select nullif(public.f_unaccent(lower(left(btrim(coalesce(p_query, '')), 100))), '') as text
  )
  select v.*
  from public.public_service_requests v, q
  where v.status = 'open'
    and v.expires_at > now()
    and (p_trade is null or v.trade = p_trade)
    and (p_site is null or v.site = p_site)
    and (p_urgency is null or v.urgency = p_urgency)
    and (q.text is null
         or public.f_unaccent(lower(v.title || ' ' || coalesce(v.description, '')))
            like '%' || replace(replace(replace(q.text, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    and (p_lat is null or p_lng is null or v.lat is null
         or extensions.st_dwithin(
              extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography,
              extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
              least(greatest(coalesce(p_radius_m, 20000), 100), 100000)))
    and (p_cursor_created_at is null
         or (v.created_at, v.id) < (p_cursor_created_at, coalesce(p_cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by v.created_at desc, v.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
comment on function public.search_service_requests(public.service_trade, text, text, public.service_urgency, double precision,
  double precision, int, int, timestamptz, uuid) is
  'Yêu cầu gọi thợ đang mở (anon được). Cursor (created_at, id) của dòng cuối. p_limit kẹp 50.';
revoke execute on function public.search_service_requests(public.service_trade, text, text, public.service_urgency,
  double precision, double precision, int, int, timestamptz, uuid) from public;
grant execute on function public.search_service_requests(public.service_trade, text, text, public.service_urgency,
  double precision, double precision, int, int, timestamptz, uuid) to anon, authenticated;

create function public.get_service_request(p_id uuid)
returns setof public.public_service_requests
language sql stable security invoker set search_path = '' as $$
  select v.* from public.public_service_requests v where v.id = p_id limit 1;
$$;
comment on function public.get_service_request(uuid) is 'Chi tiết yêu cầu công khai theo id (anon được). Không thấy → 0 dòng.';
revoke execute on function public.get_service_request(uuid) from public;
grant execute on function public.get_service_request(uuid) to anon, authenticated;

-- Địa chỉ + toạ độ CHÍNH XÁC: RLS bảng gốc chỉ cho chủ, thợ được chọn (assigned / completed) và staff → người khác 0 dòng.
create function public.get_service_request_private(p_request_id uuid)
returns table (address_text text, lat double precision, lng double precision)
language sql stable security invoker set search_path = '' as $$
  select r.address_text,
         extensions.st_y(r.location::extensions.geometry)::double precision,
         extensions.st_x(r.location::extensions.geometry)::double precision
  from public.service_requests r
  where r.id = p_request_id;
$$;
comment on function public.get_service_request_private(uuid) is
  'Địa chỉ + toạ độ chính xác của yêu cầu — chỉ chủ / thợ được chọn / staff (RLS), người khác 0 dòng.';
revoke execute on function public.get_service_request_private(uuid) from public, anon;
grant execute on function public.get_service_request_private(uuid) to authenticated;

-- Báo giá của một yêu cầu: chủ thấy tất cả, thợ chỉ thấy của mình (RLS). Tên "An N.", điểm uy tín qua public_profiles.
create function public.list_request_quotes(p_request_id uuid)
returns table (
  id uuid,
  pro_id uuid,
  price numeric,
  available_at timestamptz,
  note text,
  status public.service_quote_status,
  created_at timestamptz,
  pro_name text,
  pro_avatar_url text,
  pro_badges text[],
  pro_rating_avg numeric,
  pro_rating_count int
)
language sql stable security invoker set search_path = '' as $$
  select q.id, q.pro_id, q.price, q.available_at, q.note, q.status, q.created_at,
         pp.display_name, pp.avatar_url, pp.badges, pp.rating_avg, pp.rating_count
  from public.service_quotes q
  left join public.public_profiles pp on pp.id = q.pro_id
  where q.request_id = p_request_id
  order by (q.status = 'accepted') desc, (q.status = 'submitted') desc, q.price, q.created_at;
$$;
comment on function public.list_request_quotes(uuid) is 'Báo giá của yêu cầu theo quyền xem (RLS service_quotes).';
revoke execute on function public.list_request_quotes(uuid) from public, anon;
grant execute on function public.list_request_quotes(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Nội bộ: đóng yêu cầu (huỷ / hết hạn) — từ chối báo giá còn lại + thông báo. Không cấp cho client.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.close_service_request(
  p_request_id uuid,
  p_status public.service_request_status,
  p_notify_type text,
  p_notify_customer boolean
)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_title text;
  v_customer uuid;
begin
  update public.service_requests set status = p_status
  where id = p_request_id
  returning title, customer_id into v_title, v_customer;

  with declined as (
    update public.service_quotes set status = 'declined'
    where request_id = p_request_id and status in ('submitted', 'accepted')
    returning pro_id
  )
  insert into public.notifications (user_id, type, title_key, body_key, params, data)
  select d.pro_id, p_notify_type, p_notify_type || '.title', p_notify_type || '.body',
         jsonb_build_object('title', v_title),
         jsonb_build_object('screen', 'service_request', 'params', jsonb_build_object('id', p_request_id))
  from declined d
  join public.profiles p on p.id = d.pro_id and p.deleted_at is null;

  if p_notify_customer then
    insert into public.notifications (user_id, type, title_key, body_key, params, data)
    select v_customer, p_notify_type, p_notify_type || '.title', p_notify_type || '.body_owner',
           jsonb_build_object('title', v_title),
           jsonb_build_object('screen', 'service_request', 'params', jsonb_build_object('id', p_request_id))
    from public.profiles p where p.id = v_customer and p.deleted_at is null;
  end if;
end;
$$;
revoke execute on function public.close_service_request(uuid, public.service_request_status, text, boolean) from public, anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- RPC ghi (definer, khoá dòng yêu cầu)
-- Lỗi P0001: auth_required, banned, not_found, forbidden, cannot_quote_own, blocked, request_closed, invalid_input,
--   already_quoted, quote_not_pending, request_not_assigned, request_not_completed, already_rated, rate_limited,
--   message_has_phone, message_profanity.
-- ═════════════════════════════════════════════════════════════════════════════
-- Thợ gửi / sửa giá / gửi lại báo giá (sau khi rút). Thông báo quote_received cho chủ khi báo giá MỚI hoặc gửi lại.
create function public.submit_quote_tx(
  p_request_id uuid,
  p_price numeric,
  p_available_at timestamptz default null,
  p_note text default null
)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_request public.service_requests;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_violation text;
  v_existing public.service_quotes;
  v_id uuid;
  v_notify boolean := true;
  v_pro_name text;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if public.is_banned() then
    raise exception using errcode = 'P0001', message = 'banned';
  end if;
  select r.* into v_request
  from public.service_requests r join public.profiles p on p.id = r.customer_id
  where r.id = p_request_id and r.deleted_at is null and p.deleted_at is null and not p.is_banned
  for update of r;
  if v_request.id is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_request.customer_id = v_uid then
    raise exception using errcode = 'P0001', message = 'cannot_quote_own';
  end if;
  if public.is_blocked(v_uid, v_request.customer_id) then
    raise exception using errcode = 'P0001', message = 'blocked';
  end if;
  if v_request.status <> 'open' or v_request.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'request_closed';
  end if;
  if p_price is null or p_price < 1000 or p_price > 1000000000 or char_length(v_note) > 500
     or (p_available_at is not null and p_available_at < now() - interval '1 hour') then
    raise exception using errcode = 'P0001', message = 'invalid_input';
  end if;
  v_violation := public.chat_message_violation(v_note);
  if v_violation is not null then
    raise exception using errcode = 'P0001', message = v_violation;
  end if;

  select * into v_existing from public.service_quotes where request_id = p_request_id and pro_id = v_uid for update;
  if v_existing.id is not null and v_existing.status in ('accepted', 'declined') then
    raise exception using errcode = 'P0001', message = 'already_quoted';
  end if;
  perform public.assert_rate_limit(v_uid::text, 'submit_quote', 20, 3600);   -- RATE_LIMITS.quotesPerHour

  if v_existing.id is null then
    insert into public.service_quotes (request_id, pro_id, price, available_at, note)
    values (p_request_id, v_uid, round(p_price), p_available_at, v_note)
    returning id into v_id;
  else
    v_notify := v_existing.status = 'withdrawn';   -- sửa giá khi đang gửi: không báo lại cho chủ
    update public.service_quotes
    set price = round(p_price), available_at = p_available_at, note = v_note, status = 'submitted'
    where id = v_existing.id
    returning id into v_id;
  end if;

  if v_notify then
    select public.short_name(full_name) into v_pro_name from public.profiles where id = v_uid;
    insert into public.notifications (user_id, type, title_key, body_key, params, data)
    values (v_request.customer_id, 'quote_received', 'quote_received.title', 'quote_received.body',
            jsonb_build_object('title', v_request.title, 'pro_name', coalesce(nullif(v_pro_name, ''), '…'), 'price', round(p_price)),
            jsonb_build_object('screen', 'service_request', 'params', jsonb_build_object('id', p_request_id)));
  end if;
  return v_id;
end;
$$;
comment on function public.submit_quote_tx(uuid, numeric, timestamptz, text) is
  'Thợ gửi / sửa / gửi lại báo giá (khoá dòng yêu cầu). Trả quote id. Rate limit 20 / giờ.';
revoke execute on function public.submit_quote_tx(uuid, numeric, timestamptz, text) from public, anon;
grant execute on function public.submit_quote_tx(uuid, numeric, timestamptz, text) to authenticated;

-- Thợ rút báo giá đang gửi (đã được chọn thì không rút: chủ huỷ yêu cầu hoặc hai bên thoả thuận ngoài app).
create function public.withdraw_quote(p_quote_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_quote public.service_quotes;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  select * into v_quote from public.service_quotes where id = p_quote_id for update;
  if v_quote.id is null or v_quote.pro_id <> v_uid then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_quote.status <> 'submitted' then
    raise exception using errcode = 'P0001', message = 'quote_not_pending';
  end if;
  update public.service_quotes set status = 'withdrawn' where id = p_quote_id;
end;
$$;
comment on function public.withdraw_quote(uuid) is 'Thợ rút báo giá đang gửi.';
revoke execute on function public.withdraw_quote(uuid) from public, anon;
grant execute on function public.withdraw_quote(uuid) to authenticated;

-- Chủ huỷ yêu cầu (open / assigned): báo giá còn lại bị từ chối, thợ nhận request_cancelled.
create function public.cancel_request(p_request_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_request public.service_requests;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  select * into v_request from public.service_requests where id = p_request_id and deleted_at is null for update;
  if v_request.id is null or v_request.customer_id <> v_uid then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_request.status not in ('open', 'assigned') then
    raise exception using errcode = 'P0001', message = 'request_closed';
  end if;
  perform public.close_service_request(p_request_id, 'cancelled', 'request_cancelled', false);
end;
$$;
comment on function public.cancel_request(uuid) is 'Chủ huỷ yêu cầu (open / assigned).';
revoke execute on function public.cancel_request(uuid) from public, anon;
grant execute on function public.cancel_request(uuid) to authenticated;

-- Chủ xác nhận hoàn thành (assigned → completed) → mời thợ đánh giá.
create function public.complete_request_tx(p_request_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_request public.service_requests;
  v_pro uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if public.is_banned() then
    raise exception using errcode = 'P0001', message = 'banned';
  end if;
  select * into v_request from public.service_requests where id = p_request_id and deleted_at is null for update;
  if v_request.id is null or v_request.customer_id <> v_uid then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_request.status <> 'assigned' then
    raise exception using errcode = 'P0001', message = 'request_not_assigned';
  end if;
  update public.service_requests set status = 'completed', completed_at = now() where id = p_request_id;
  select pro_id into v_pro from public.service_quotes where id = v_request.accepted_quote_id;
  if v_pro is not null then
    insert into public.notifications (user_id, type, title_key, body_key, params, data)
    select v_pro, 'request_completed', 'request_completed.title', 'request_completed.body',
           jsonb_build_object('title', v_request.title),
           jsonb_build_object('screen', 'service_request', 'params', jsonb_build_object('id', p_request_id))
    from public.profiles p where p.id = v_pro and p.deleted_at is null;
  end if;
end;
$$;
comment on function public.complete_request_tx(uuid) is 'Chủ xác nhận hoàn thành yêu cầu (assigned → completed).';
revoke execute on function public.complete_request_tx(uuid) from public, anon;
grant execute on function public.complete_request_tx(uuid) to authenticated;

-- Đánh giá hai chiều sau khi hoàn thành: chủ chấm thợ được chọn, thợ được chọn chấm chủ. Một lần / người / yêu cầu.
create function public.rate_service_request(p_request_id uuid, p_score int, p_comment text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_request public.service_requests;
  v_pro uuid;
  v_ratee uuid;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_violation text;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if public.is_banned() then
    raise exception using errcode = 'P0001', message = 'banned';
  end if;
  if p_score is null or p_score not between 1 and 5 or char_length(v_comment) > 500 then
    raise exception using errcode = 'P0001', message = 'invalid_input';
  end if;
  select * into v_request from public.service_requests where id = p_request_id and deleted_at is null;
  if v_request.id is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  select pro_id into v_pro from public.service_quotes where id = v_request.accepted_quote_id;
  if v_uid = v_request.customer_id then
    v_ratee := v_pro;
  elsif v_uid = v_pro then
    v_ratee := v_request.customer_id;
  end if;
  if v_ratee is null then
    raise exception using errcode = 'P0001', message = 'forbidden';
  end if;
  if v_request.status <> 'completed' then
    raise exception using errcode = 'P0001', message = 'request_not_completed';
  end if;
  v_violation := public.chat_message_violation(v_comment);
  if v_violation is not null then
    raise exception using errcode = 'P0001', message = v_violation;
  end if;
  insert into public.ratings (rater_id, ratee_id, context_type, context_id, score, comment)
  values (v_uid, v_ratee, 'service_request', p_request_id, p_score, v_comment);
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'already_rated';
end;
$$;
comment on function public.rate_service_request(uuid, int, text) is
  'Chủ và thợ được chọn chấm nhau (1–5) sau khi yêu cầu hoàn thành. Một lần / người / yêu cầu.';
revoke execute on function public.rate_service_request(uuid, int, text) from public, anon;
grant execute on function public.rate_service_request(uuid, int, text) to authenticated;

-- Staff huỷ yêu cầu vi phạm (chủ + thợ nhận request_cancelled). Audit service_request.cancel.
create function public.staff_cancel_request(p_request_id uuid, p_note text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_old public.service_request_status;
begin
  if not public.is_staff() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  select status into v_old from public.service_requests where id = p_request_id and deleted_at is null for update;
  if v_old is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_old not in ('open', 'assigned') then
    raise exception using errcode = 'P0001', message = 'request_closed';
  end if;
  perform public.close_service_request(p_request_id, 'cancelled', 'request_cancelled', true);
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), 'service_request.cancel', 'service_request', p_request_id::text,
          jsonb_build_object('from', v_old, 'note', left(p_note, 500)));
end;
$$;
comment on function public.staff_cancel_request(uuid, text) is 'Staff huỷ yêu cầu gọi thợ vi phạm (audit service_request.cancel).';
revoke execute on function public.staff_cancel_request(uuid, text) from public, anon;
grant execute on function public.staff_cancel_request(uuid, text) to authenticated;

-- Cron mỗi giờ: yêu cầu open quá expires_at → expired (báo giá bị từ chối, chủ + thợ nhận request_expired). Trả số yêu cầu.
create function public.expire_service_requests()
returns int language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid;
  v_n int := 0;
begin
  for v_id in
    select id from public.service_requests where status = 'open' and deleted_at is null and expires_at <= now()
  loop
    perform public.close_service_request(v_id, 'expired', 'request_expired', true);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
comment on function public.expire_service_requests() is 'Cron mỗi giờ: yêu cầu open quá hạn → expired.';
revoke execute on function public.expire_service_requests() from public, anon, authenticated;
select cron.schedule('expire-service-requests', '10 * * * *', $$select public.expire_service_requests()$$);

-- ═════════════════════════════════════════════════════════════════════════════
-- Mở rộng bảng có sẵn
-- ═════════════════════════════════════════════════════════════════════════════
-- Thông báo: khớp NOTIFICATION_SCREENS / PREF_OF_TYPE ở @hp/shared. Chưa thuộc nhóm tuỳ chọn push → luôn gửi
-- (notification_push_enabled trả true cho loại không có nhóm, như rating_received).
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'new_message', 'join_request', 'join_accepted', 'join_declined', 'group_cancelled', 'group_reminder', 'group_completed',
  'listing_approved', 'listing_rejected', 'listing_expiring', 'lost_found_match', 'system',
  'quote_received', 'quote_accepted', 'quote_declined', 'request_cancelled', 'request_completed', 'request_expired'
));

alter table public.ratings drop constraint if exists ratings_context_type_check;
alter table public.ratings add constraint ratings_context_type_check check (context_type in ('listing', 'group', 'service_request'));

alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('listing', 'group', 'profile', 'message', 'service_request', 'service_quote'));

-- Chặn tự báo cáo: thêm yêu cầu của mình / báo giá của mình (bản đầy đủ thay trg_reports_before_insert).
create or replace function public.trg_reports_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('role', true), 'none') not in ('anon', 'authenticated') then
    return new;
  end if;
  new.status := 'open';
  new.resolved_by := null;
  new.resolved_at := null;
  if (new.target_type = 'profile' and new.target_id = new.reporter_id)
     or (new.target_type = 'listing' and exists (select 1 from public.listings where id = new.target_id and owner_id = new.reporter_id))
     or (new.target_type = 'service_request' and exists (select 1 from public.service_requests where id = new.target_id and customer_id = new.reporter_id))
     or (new.target_type = 'service_quote' and exists (select 1 from public.service_quotes where id = new.target_id and pro_id = new.reporter_id)) then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'reports: không tự báo cáo mình';
  end if;
  perform public.assert_rate_limit(new.reporter_id::text, 'report', 3, 3600);   -- RATE_LIMITS.reportsPerHour
  return new;
end;
$$;

-- Xoá tài khoản: thêm huỷ yêu cầu mở / đã giao của mình (báo giá bị từ chối) và rút báo giá đang gửi.
create or replace function public.delete_my_account()
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  update public.groups set status = 'cancelled'
  where host_id = v_uid and status in ('open', 'full') and deleted_at is null;
  update public.group_members set status = 'left'
  where user_id = v_uid and status in ('requested', 'accepted');
  update public.service_quotes set status = 'withdrawn' where pro_id = v_uid and status = 'submitted';
  with closed as (
    update public.service_requests set status = 'cancelled'
    where customer_id = v_uid and status in ('open', 'assigned') and deleted_at is null
    returning id
  )
  update public.service_quotes q set status = 'declined'
  from closed where q.request_id = closed.id and q.status in ('submitted', 'accepted');
  update public.profiles set deleted_at = now(), push_tokens = '{}'
  where id = v_uid and deleted_at is null;
  insert into public.audit_log (actor_id, action, target_type, target_id) values (v_uid, 'account.delete', 'profile', v_uid::text);
end;
$$;

-- Dashboard: thêm requests_open (yêu cầu đang mở) và requests_new_7d.
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles where deleted_at is null),
    'users_new_7d', (select count(*) from public.profiles where deleted_at is null and created_at > now() - interval '7 days'),
    'users_banned', (select count(*) from public.profiles
                     where deleted_at is null and (is_banned or (banned_until is not null and banned_until > now()))),
    'listings_active', (select count(*) from public.listings
                        where status = 'active' and deleted_at is null and (expires_at is null or expires_at > now())),
    'listings_new_7d', (select count(*) from public.listings where deleted_at is null and created_at > now() - interval '7 days'),
    'listings_by_category', (select coalesce(jsonb_object_agg(category, n), '{}') from (
        select category::text, count(*) as n from public.listings
        where status = 'active' and deleted_at is null group by category) c),
    'groups_upcoming', (select count(*) from public.groups where status in ('open', 'full') and deleted_at is null and starts_at > now()),
    'groups_new_7d', (select count(*) from public.groups where deleted_at is null and created_at > now() - interval '7 days'),
    'messages_24h', (select count(*) from public.messages where created_at > now() - interval '24 hours'),
    'moderation_pending', (select count(*) from public.moderation_queue where status = 'pending'),
    'reports_open', (select count(*) from public.reports where status in ('open', 'reviewing')),
    'badges_pending', (select count(*) from public.badge_requests where status = 'pending'),
    'venues_pending', (select count(*) from public.venues where status = 'pending' and deleted_at is null),
    'leads_new', (select count(*) from public.marketing_leads where status = 'new'),
    'requests_open', (select count(*) from public.service_requests
                      where status = 'open' and deleted_at is null and expires_at > now()),
    'requests_new_7d', (select count(*) from public.service_requests
                        where deleted_at is null and created_at > now() - interval '7 days')
  );
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- Storage: bucket công khai request-images ({user_id}/{request_id}/{n}.webp), ghi vào thư mục của mình như listing-images.
-- ═════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('request-images', 'request-images', true, 2 * 1024 * 1024, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists request_images_insert_own on storage.objects;
create policy request_images_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'request-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_banned())
  );

drop policy if exists request_images_delete_own_or_staff on storage.objects;
create policy request_images_delete_own_or_staff on storage.objects for delete to authenticated
  using (
    bucket_id = 'request-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_staff()))
  );

drop policy if exists request_images_select_own on storage.objects;
create policy request_images_select_own on storage.objects for select to authenticated
  using (
    bucket_id = 'request-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
