-- public_listings theo vòng đời + sitemap / thống kê công khai + webhook revalidate web (tuần 4)
-- Mục đích:
--   1. Trang chi tiết tin đã bán / đóng / hết hạn vẫn mở được (200 + nhãn, 410 sau 30 ngày — .claude/rules/web-seo-public.md):
--      view public_listings thêm các trạng thái đó + cột is_expired, inactive_since. Danh sách / tìm kiếm vẫn chỉ tin active.
--   2. sitemap_listings(p_page), public_stats() cho web.
--   3. Webhook: tin đổi nội dung / trạng thái → POST web_revalidate_url (bảng app_settings) để web làm mới cache ngay.
-- Client: @hp/core listingDisplayStatus(), isListingGone(); web /tin/[slug] (410), sitemap.ts, /api/revalidate.

-- ═════════════════════════════════════════════════════════════════════════════
-- public_listings v2 — cột cũ giữ nguyên thứ tự (create or replace chỉ thêm cột ở cuối).
--   status: trạng thái thật trong DB; is_expired: active nhưng đã quá expires_at (cron chưa kịp đổi);
--   inactive_since: thời điểm tin thôi hiện (null khi còn active) — web trả 410 khi > 30 ngày.
--   Không bao giờ có: draft, pending_review, rejected, tin đã xoá.
-- ═════════════════════════════════════════════════════════════════════════════
create or replace view public.public_listings with (security_invoker = false) as
select
  l.id,
  l.slug,
  l.short_id,
  l.category,
  l.status,
  l.title,
  l.description,
  l.price,
  l.price_type,
  l.attributes,
  l.site,
  s.name as site_name,
  extensions.st_y(g.snapped)::double precision as lat,
  extensions.st_x(g.snapped)::double precision as lng,
  (round(extensions.st_distance(g.snapped::extensions.geography, s.location) / 100) * 100)::int as distance_to_site_m,
  l.address_text,
  l.images,
  l.lang,
  l.view_count,
  l.expires_at,
  l.created_at,
  l.updated_at,
  l.owner_id,
  public.short_name(p.full_name) as owner_name,
  p.avatar_url as owner_avatar_url,
  p.badges as owner_badges,
  p.rating_avg as owner_rating_avg,
  p.rating_count as owner_rating_count,
  p.created_at as owner_since,
  l.search_vector,
  (l.status = 'active' and l.expires_at is not null and l.expires_at <= now()) as is_expired,
  case
    when l.status = 'active' and (l.expires_at is null or l.expires_at > now()) then null
    when l.status = 'active' then l.expires_at
    else l.updated_at
  end as inactive_since
from public.listings l
join public.profiles p on p.id = l.owner_id
left join public.sites s on s.code = l.site
left join lateral (
  select extensions.st_snaptogrid(l.location::extensions.geometry, 0.003) as snapped
) g on true
where l.status in ('active', 'sold', 'closed', 'expired')
  and l.deleted_at is null
  and p.deleted_at is null
  and not p.is_banned
  and (p.banned_until is null or p.banned_until <= now())
  and not public.is_blocked(l.owner_id, (select auth.uid()));
comment on view public.public_listings is
  'Tin công khai: active + đã bán / đóng / hết hạn (cho trang chi tiết). Danh sách lọc status = active and not is_expired. '
  'Không thêm cột nhạy cảm: SĐT, vị trí chính xác, họ tên đầy đủ.';

-- ═════════════════════════════════════════════════════════════════════════════
-- RPC danh sách: chỉ tin đang hiện (active, chưa hết hạn)
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.search_listings(
  p_categories public.listing_category[] default null,
  p_query text default null,
  p_site text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m int default 10000,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_attributes jsonb default null,
  p_limit int default 20,
  p_cursor timestamptz default null
)
returns setof public.public_listings
language sql stable security invoker set search_path = '' as $$
  with q as (
    select nullif(public.f_unaccent(left(btrim(coalesce(p_query, '')), 100)), '') as text
  )
  select v.*
  from public.public_listings v, q
  where v.status = 'active' and not v.is_expired
    and (p_categories is null or cardinality(p_categories) = 0 or v.category = any (p_categories))
    and (q.text is null
         or v.search_vector @@ plainto_tsquery('simple', q.text)
         or public.f_unaccent(v.title) operator(extensions.%) q.text
         or public.f_unaccent(v.title) like '%' || replace(replace(replace(q.text, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    and (p_site is null or v.site = p_site)
    and (p_lat is null or p_lng is null
         or extensions.st_dwithin(
              extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography,
              extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
              least(greatest(coalesce(p_radius_m, 10000), 100), 50000)))
    and (p_price_min is null or v.price >= p_price_min)
    and (p_price_max is null or v.price <= p_price_max)
    and (p_attributes is null or v.attributes @> p_attributes)
    and (p_cursor is null or v.created_at < p_cursor)
  order by v.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create or replace function public.similar_listings(p_listing_id uuid, p_limit int default 6)
returns setof public.public_listings
language sql stable security invoker set search_path = '' as $$
  select v.*
  from public.public_listings v
  join public.public_listings src on src.id = p_listing_id
  where v.category = src.category and v.id <> src.id and v.status = 'active' and not v.is_expired
  order by (v.site is not distinct from src.site) desc, v.created_at desc
  limit least(greatest(coalesce(p_limit, 6), 1), 20);
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- sitemap_listings — slug + updated_at của tin đang hiện, 10.000 / trang (trang 1 = mới nhất).
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.sitemap_listings(p_page int default 1)
returns table (slug text, updated_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select v.slug, v.updated_at
  from public.public_listings v
  where v.status = 'active' and not v.is_expired
  order by v.created_at desc
  offset (greatest(coalesce(p_page, 1), 1) - 1) * 10000
  limit 10000;
$$;
comment on function public.sitemap_listings(int) is 'Sitemap tin (web sitemap.ts). Số trang = ceil(public_stats().listings / 10000).';
revoke execute on function public.sitemap_listings(int) from public;
grant execute on function public.sitemap_listings(int) to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- public_stats — số liệu thật cho trang chủ / landing (chỉ đếm, không PII). Web cache 1 giờ ('use cache').
-- security definer: anon không đọc được profiles nhưng được biết tổng số người dùng.
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.public_stats()
returns table (users bigint, listings bigint, sites bigint)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*) from public.profiles where deleted_at is null and not is_banned),
    (select count(*) from public.listings
      where status = 'active' and deleted_at is null and (expires_at is null or expires_at > now())),
    (select count(*) from public.sites where is_active);
$$;
comment on function public.public_stats() is 'Tổng người dùng / tin đang đăng / khu. Chỉ số đếm.';
revoke execute on function public.public_stats() from public;
grant execute on function public.public_stats() to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- app_settings — cấu hình nội bộ cho trigger / cron (URL web, secret). Không policy: chỉ function definer đọc,
-- client không chạm được. Local: supabase/seed/listings.sql; staging / prod: insert tay (docs/RUNBOOK.md), không commit
-- giá trị thật. (Supabase không cho role postgres "alter database set app.*" nên không dùng current_setting.)
-- ═════════════════════════════════════════════════════════════════════════════
create table if not exists public.app_settings (
  key text primary key check (key ~ '^[a-z_]+$'),
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

create or replace function public.app_setting(p_key text)
returns text language sql stable security definer set search_path = '' as $$
  select nullif(value, '') from public.app_settings where key = p_key;
$$;
revoke execute on function public.app_setting(text) from public, anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Webhook revalidate: tin đổi → POST app_setting('web_revalidate_url') header x-revalidate-secret, body {"tags": [...]}.
-- Chưa cấu hình → không gửi. pg_net gửi bất đồng bộ sau commit, không làm chậm / hỏng giao dịch ghi tin.
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.trg_listings_revalidate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url text := public.app_setting('web_revalidate_url');
  v_secret text := public.app_setting('web_revalidate_secret');
begin
  if v_url is null or v_secret is null then
    return null;
  end if;
  if tg_op = 'UPDATE'
     and (old.status, old.title, old.description, old.price, old.price_type, old.images, old.attributes, old.site, old.deleted_at, old.expires_at)
         is not distinct from
         (new.status, new.title, new.description, new.price, new.price_type, new.images, new.attributes, new.site, new.deleted_at, new.expires_at) then
    return null;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('tags', jsonb_build_array('listing:' || new.id::text, 'listings')),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-revalidate-secret', v_secret)
  );
  return null;
end;
$$;
revoke execute on function public.trg_listings_revalidate() from public, anon, authenticated;

create trigger trg_listings_revalidate after insert or update on public.listings
  for each row execute function public.trg_listings_revalidate();
