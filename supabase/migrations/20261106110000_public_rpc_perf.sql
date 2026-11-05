-- Hiệu năng RPC công khai trên 50k tin (docs/plan/backend.md tuần 11, đo bằng supabase/perf/50k_explain.sql).
-- Ảnh hưởng: listings.title_search (cột sinh mới), public_listings (view, thêm cột title_search ở cuối), search_listings,
-- similar_listings, home_feed. Chữ ký không đổi; client không cần sửa (type sinh lại có thêm title_search).
--
-- Nguyên nhân chậm (trước sửa, 50k tin): hàm `language sql` có `set search_path` không được inline → chạy bằng kế hoạch
-- chung, các điều kiện `(p_x is null or …)` không bỏ được → quét toàn bộ tin active, tính is_blocked() (security definer,
-- không inline) + PostGIS cho từng dòng rồi mới sắp xếp. search_listings() không lọc 530 ms, có từ khoá 1,2 s;
-- home_feed 220 ms; similar_listings 190 ms.
-- Sửa:
--   1. public_listings: lọc người chặn bằng `not exists` trên blocks (view chạy quyền chủ, inline được thành anti-join);
--      khách (auth.uid() null) bỏ qua hẳn. Ngữ nghĩa giữ nguyên is_blocked(owner, viewer).
--   2. search_listings: plpgsql + EXECUTE … USING → kế hoạch một lần với giá trị tham số thật (điều kiện null bị gấp bỏ,
--      dùng được listings_active_created_idx / GIN / trigram).
--   2b. Từ khoá: cột sinh title_search = f_unaccent(title) (lưu sẵn) + GIN trigram thay index trên biểu thức — kiểm lại
--      kết quả GIN không phải bỏ dấu từng dòng (like '%冰箱%' 178 → 15 ms). So mờ đổi `title % q` (cả chuỗi, ngưỡng 0,3:
--      từ ngắn kéo hàng chục nghìn ứng viên) sang `q <% title_search` (word similarity 0,6: "dien thaoi" vẫn khớp
--      "điện thoại", 125 → 10 ms).
--   3. similar_listings, home_feed (plpgsql + EXECUTE USING): tách nhóm (cùng khu / khác khu, danh mục hay xem / còn lại), mỗi nhóm lấy theo
--      created_at desc có limit (dừng sớm theo index) rồi mới xếp — kết quả giống hệt bản cũ.

alter table public.listings add column if not exists title_search text
  generated always as (public.f_unaccent(title)) stored;
comment on column public.listings.title_search is 'Tiêu đề bỏ dấu (f_unaccent) cho tìm kiếm trigram — cột sinh, không ghi.';
create index if not exists listings_title_search_trgm_idx on public.listings using gin (title_search extensions.gin_trgm_ops);
drop index if exists public.listings_title_trgm_idx;

create or replace view public.public_listings with (security_invoker = false) as
select l.id, l.slug, l.short_id, l.category, l.status, l.title, l.description, l.price, l.price_type, l.attributes,
       l.site, s.name as site_name,
       extensions.st_y(g.snapped) as lat, extensions.st_x(g.snapped) as lng,
       (round(extensions.st_distance(g.snapped::extensions.geography, s.location) / 100) * 100)::int as distance_to_site_m,
       l.address_text, l.images, l.lang, l.view_count, l.expires_at, l.created_at, l.updated_at,
       l.owner_id, public.short_name(p.full_name) as owner_name, p.avatar_url as owner_avatar_url,
       p.badges as owner_badges, p.rating_avg as owner_rating_avg, p.rating_count as owner_rating_count,
       p.created_at as owner_since, l.search_vector,
       l.status = 'active' and l.expires_at is not null and l.expires_at <= now() as is_expired,
       case
         when l.status = 'active' and (l.expires_at is null or l.expires_at > now()) then null::timestamptz
         when l.status = 'active' then l.expires_at
         else l.updated_at
       end as inactive_since,
       l.title_search
from public.listings l
join public.profiles p on p.id = l.owner_id
left join public.sites s on s.code = l.site
left join lateral (select extensions.st_snaptogrid(l.location::extensions.geometry, 0.003) as snapped) g on true
where l.status in ('active', 'sold', 'closed', 'expired')
  and l.published_at is not null and not l.moderation_hold
  and l.deleted_at is null
  and p.deleted_at is null and not p.is_banned and (p.banned_until is null or p.banned_until <= now())
  and ((select auth.uid()) is null
       or not exists (
         select 1 from public.blocks b
         where (b.blocker_id = l.owner_id and b.blocked_id = (select auth.uid()))
            or (b.blocker_id = (select auth.uid()) and b.blocked_id = l.owner_id)));

create or replace function public.search_listings(
  p_categories public.listing_category[] default null,
  p_query text default null,
  p_site text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m integer default 10000,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_attributes jsonb default null,
  p_limit integer default 20,
  p_cursor timestamptz default null,
  p_max_distance_m integer default null
)
returns setof public.public_listings
language plpgsql stable set search_path = '' as $$
declare
  v_text text := nullif(public.f_unaccent(left(btrim(coalesce(p_query, '')), 100)), '');
  v_like text;
  v_short text;
begin
  if cardinality(p_categories) = 0 then
    p_categories := null;
  end if;
  -- Chuỗi < 3 ký tự không có trigram cho LIKE → index trả mọi dòng. Chữ Latin ngắn ('xe', 'ví' → 'vi') đã khớp nguyên từ
  -- qua tsvector; chữ Trung ngắn ('冰箱', không tách từ) dùng strpos (không index) để kế hoạch đi theo created_at và dừng
  -- khi đủ kết quả (từ hiếm / không có kết quả → quét hết tin active, ~190 ms ở 50k tin — chấp nhận, ghi ở plan).
  if v_text is not null and char_length(v_text) >= 3 then
    v_like := '%' || replace(replace(replace(v_text, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  elsif v_text ~ '[^\x01-\x7f]' then
    v_short := v_text;
  end if;
  -- EXECUTE … USING: lập kế hoạch với giá trị thật mỗi lần gọi (tham số null → điều kiện bị bỏ).
  return query execute $q$
    select v.*
    from public.public_listings v
    where v.status = 'active' and not v.is_expired
      and ($1 is null or v.category = any ($1))
      and ($2 is null
           or v.search_vector @@ plainto_tsquery('simple', $2)
           or $2 operator(extensions.<%) v.title_search
           or ($3 is not null and v.title_search like $3)
           or ($14 is not null and strpos(v.title_search, $14) > 0))
      and ($4 is null or v.site = $4)
      and ($5 is null or $6 is null
           or extensions.st_dwithin(
                extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography,
                extensions.st_setsrid(extensions.st_makepoint($6, $5), 4326)::extensions.geography,
                $7))
      and ($8 is null or (v.distance_to_site_m is not null and v.distance_to_site_m <= $8))
      and ($9 is null or v.price >= $9)
      and ($10 is null or v.price <= $10)
      and ($11 is null or v.attributes @> $11)
      and ($12 is null or v.created_at < $12)
    order by v.created_at desc
    limit $13
  $q$
  using p_categories, v_text, v_like, p_site, p_lat, p_lng,
        least(greatest(coalesce(p_radius_m, 10000), 100), 50000),
        case when p_max_distance_m is null then null else least(greatest(p_max_distance_m, 100), 50000) end,
        p_price_min, p_price_max, p_attributes, p_cursor,
        least(greatest(coalesce(p_limit, 20), 1), 50), v_short;
end;
$$;
comment on function public.search_listings(public.listing_category[], text, text, double precision, double precision, integer,
  numeric, numeric, jsonb, integer, timestamptz, integer) is
  'Tìm tin active (public_listings): danh mục, từ khoá (tsvector + word similarity + chứa chuỗi trên title_search), khu, bán kính trên toạ độ đã làm tròn, khoảng cách tới khu, giá, attributes, cursor created_at. Kế hoạch theo giá trị thật (EXECUTE USING).';

create or replace function public.similar_listings(p_listing_id uuid, p_limit integer default 6)
returns setof public.public_listings
language sql stable set search_path = '' as $$
  with src as (
    select category, site from public.public_listings where id = p_listing_id
  ), n as (
    select least(greatest(coalesce(p_limit, 6), 1), 20) as n
  ), cand as (
    (select v.*, true as same_site
     from public.public_listings v, src
     where v.category = src.category and v.site is not distinct from src.site and v.id <> p_listing_id
       and v.status = 'active' and not v.is_expired
     order by v.created_at desc
     limit (select n from n))
    union all
    (select v.*, false as same_site
     from public.public_listings v, src
     where v.category = src.category and v.site is distinct from src.site
       and v.status = 'active' and not v.is_expired
     order by v.created_at desc
     limit (select n from n))
  )
  select id, slug, short_id, category, status, title, description, price, price_type, attributes, site, site_name, lat, lng,
         distance_to_site_m, address_text, images, lang, view_count, expires_at, created_at, updated_at, owner_id, owner_name,
         owner_avatar_url, owner_badges, owner_rating_avg, owner_rating_count, owner_since, search_vector, is_expired,
         inactive_since, title_search
  from cand
  order by same_site desc, created_at desc
  limit (select n from n);
$$;

create or replace function public.home_feed(p_site text default null, p_limit integer default 20)
returns setof public.public_listings
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_site text;
  v_cats public.listing_category[] := '{}';
  v_n int := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  v_site := coalesce(p_site, (select site from public.profiles where id = v_uid));
  if v_uid is not null then
    v_cats := array(
      select l.category
      from public.listing_views lv
      join public.listings l on l.id = lv.listing_id
      where lv.user_id = v_uid and lv.viewed_at > now() - interval '30 days'
      group by l.category
      order by count(*) desc
      limit 3);
  end if;
  -- 4 nhóm theo thứ tự ưu tiên (cùng khu + danh mục hay xem → cùng khu → khác khu + hay xem → còn lại), mỗi nhóm tối đa
  -- n tin mới nhất. EXECUTE … USING: nhóm không áp dụng (không có khu / chưa xem gì) bị gấp bỏ lúc lập kế hoạch.
  return query execute $q$
    with cand as (
      (select v.*, 1 as bucket from public.public_listings v
       where $2 is not null and cardinality($3) > 0 and v.site = $2 and v.category = any ($3)
         and v.status = 'active' and not v.is_expired and ($1 is null or v.owner_id <> $1)
         and v.created_at > now() - interval '30 days'
       order by v.created_at desc limit $4)
      union all
      (select v.*, 2 from public.public_listings v
       where $2 is not null and v.site = $2 and not (v.category = any ($3))
         and v.status = 'active' and not v.is_expired and ($1 is null or v.owner_id <> $1)
         and v.created_at > now() - interval '30 days'
       order by v.created_at desc limit $4)
      union all
      (select v.*, 3 from public.public_listings v
       where cardinality($3) > 0 and ($2 is null or v.site is distinct from $2) and v.category = any ($3)
         and v.status = 'active' and not v.is_expired and ($1 is null or v.owner_id <> $1)
         and v.created_at > now() - interval '30 days'
       order by v.created_at desc limit $4)
      union all
      (select v.*, 4 from public.public_listings v
       where ($2 is null or v.site is distinct from $2) and not (v.category = any ($3))
         and v.status = 'active' and not v.is_expired and ($1 is null or v.owner_id <> $1)
         and v.created_at > now() - interval '30 days'
       order by v.created_at desc limit $4)
    )
    select id, slug, short_id, category, status, title, description, price, price_type, attributes, site, site_name, lat, lng,
           distance_to_site_m, address_text, images, lang, view_count, expires_at, created_at, updated_at, owner_id, owner_name,
           owner_avatar_url, owner_badges, owner_rating_avg, owner_rating_count, owner_since, search_vector, is_expired,
           inactive_since, title_search
    from cand
    order by bucket, created_at desc
    limit $4
  $q$ using v_uid, v_site, v_cats, v_n;
end;
$$;
