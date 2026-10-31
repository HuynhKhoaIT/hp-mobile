-- public_listings + RPC đọc công khai (tuần 3)
-- Mục đích: lối duy nhất cho anon / người khác đọc tin đăng — che PII, vị trí làm tròn ~300 m.
-- View: public_listings. RPC: search_listings, get_listing_by_slug, similar_listings (anon + authenticated).
-- Client: @hp/core listings.ts (searchListings, getListingBySlug, similarListings). Web /tin/[slug], list;
--         app Hub / List / Detail.
--
-- Index (explain trên seed 500 tin, kết quả ở docs/plan/backend.md tuần 3):
--   list không lọc / theo category → listings_active_created_idx / listings_cat_status_idx (đọc theo created_at desc, dừng ở limit)
--   từ khoá → listings_search_idx / listings_title_trgm_idx
--   bán kính tính trên vị trí đã làm tròn (không dò được vị trí thật bằng cách thu nhỏ bán kính) nên không dùng
--   listings_location_idx; lọc sau category / khu. Đo lại với 50k tin ở tuần 11.

-- ═════════════════════════════════════════════════════════════════════════════
-- public_listings — chạy quyền owner (bỏ qua RLS bảng gốc) nên tự lọc chặt:
--   chỉ tin active, chưa xoá, chưa hết hạn; ẩn tin của người bị cấm / đã xoá tài khoản; ẩn hai chiều khi chặn nhau.
--   Không SĐT, không vị trí chính xác (snap lưới 0.003° ≈ 300 m), tên người đăng dạng "An N.".
-- search_vector có trong view để RPC tìm kiếm dùng được index; client không chọn cột này (core LISTING_COLUMNS).
-- ═════════════════════════════════════════════════════════════════════════════
create view public.public_listings with (security_invoker = false) as
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
  -- tính từ vị trí đã làm tròn (không lộ thêm), làm tròn 100 m
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
  l.search_vector
from public.listings l
join public.profiles p on p.id = l.owner_id
left join public.sites s on s.code = l.site
left join lateral (
  select extensions.st_snaptogrid(l.location::extensions.geometry, 0.003) as snapped
) g on true
where l.status = 'active'
  and l.deleted_at is null
  and (l.expires_at is null or l.expires_at > now())
  and p.deleted_at is null
  and not p.is_banned
  and (p.banned_until is null or p.banned_until <= now())
  and not public.is_blocked(l.owner_id, (select auth.uid()));
comment on view public.public_listings is
  'Tin đăng công khai (web /tin/[slug], list app / web). Không thêm cột nhạy cảm: SĐT, vị trí chính xác, họ tên đầy đủ.';
grant select on public.public_listings to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- search_listings — list + tìm kiếm + lọc. Cursor theo created_at (không offset), p_limit ≤ 50.
--   p_query: full-text không dấu OR trigram trên tiêu đề (bắt buộc cho tiếng Trung, gõ sai chính tả).
--   p_attributes: lọc theo thuộc tính (jsonb containment), vd {"condition":"used"}.
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
  where (p_categories is null or cardinality(p_categories) = 0 or v.category = any (p_categories))
    and (q.text is null
         or v.search_vector @@ plainto_tsquery('simple', q.text)
         -- gần đúng (gõ sai chính tả)
         or public.f_unaccent(v.title) operator(extensions.%) q.text
         -- chuỗi con: tiếng Trung không có dấu cách nên full-text không tách được từ
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
comment on function public.search_listings is
  'List / tìm tin công khai. Trả public_listings (đã che PII). Cursor = created_at của dòng cuối. Bán kính 100 m – 50 km.';
revoke execute on function public.search_listings from public;
grant execute on function public.search_listings to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- get_listing_by_slug — slug dạng {tieu-de}-{short_id}; tìm theo short_id ở cuối (đổi tiêu đề link cũ vẫn mở).
-- Web so slug trả về với slug trên URL → 301 khi khác.
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.get_listing_by_slug(p_slug text)
returns setof public.public_listings
language sql stable security invoker set search_path = '' as $$
  select v.*
  from public.public_listings v
  where v.short_id = substring(lower(coalesce(p_slug, '')) from '([0-9a-z]{6})$')
  limit 1;
$$;
comment on function public.get_listing_by_slug(text) is 'Chi tiết tin công khai theo slug (khớp short_id 6 ký tự cuối). Không thấy → 0 dòng.';
revoke execute on function public.get_listing_by_slug(text) from public;
grant execute on function public.get_listing_by_slug(text) to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- similar_listings — cùng category, ưu tiên cùng khu, mới nhất trước. p_limit ≤ 20.
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.similar_listings(p_listing_id uuid, p_limit int default 6)
returns setof public.public_listings
language sql stable security invoker set search_path = '' as $$
  select v.*
  from public.public_listings v
  join public.public_listings src on src.id = p_listing_id
  where v.category = src.category and v.id <> src.id
  order by (v.site is not distinct from src.site) desc, v.created_at desc
  limit least(greatest(coalesce(p_limit, 6), 1), 20);
$$;
comment on function public.similar_listings(uuid, int) is 'Tin tương tự (cùng category, ưu tiên cùng khu) cho trang chi tiết.';
revoke execute on function public.similar_listings(uuid, int) from public;
grant execute on function public.similar_listings(uuid, int) to anon, authenticated;
