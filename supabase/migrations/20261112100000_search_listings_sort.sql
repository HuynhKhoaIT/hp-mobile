-- search_listings: sắp xếp theo giá + lọc "Cho tặng" (trang chủ riêng Pass đồ, bộ lọc kiểu chợ đồ cũ).
-- Ảnh hưởng: RPC search_listings (chữ ký đổi → drop bản cũ, tạo lại, grant lại anon / authenticated).
-- Client cần cập nhật: @hp/core searchListings (p_sort, p_free_only, cursor giá), @hp/shared ListingFilters (sort, freeOnly),
-- sinh lại packages/db/database.types.ts.
--
-- Tham số mới (đều có default → lời gọi cũ vẫn chạy, kết quả giữ nguyên):
--   p_sort         'newest' (mặc định, created_at desc) | 'price_asc' | 'price_desc'; giá trị khác → 'newest'.
--   p_free_only    chỉ tin price_type = 'free' (cho tặng / miễn phí).
--   p_cursor_price, p_cursor_id  cursor khi sắp theo giá, cùng p_cursor (created_at) của tin cuối trang trước.
-- Khoá giá khi sắp: free → 0, còn lại price; tin "thoả thuận" không có giá luôn xếp cuối (cả hai chiều) nhờ giá trị
-- chặn (asc 1e15, desc -1). Thứ tự (khoá giá, created_at desc, id desc) là thứ tự toàn phần → cursor không trùng / sót tin.
-- Hiệu năng: sắp theo giá phải đọc mọi tin khớp bộ lọc rồi lấy top-N (không có index theo khoá giá qua view). Cần đo bằng
-- supabase/perf/50k_explain.sql trước khi ra mắt; mặc định 'newest' giữ kế hoạch cũ (listings_active_created_idx).

drop function if exists public.search_listings(public.listing_category[], text, text, double precision, double precision, integer,
  numeric, numeric, jsonb, integer, timestamptz, integer);

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
  p_max_distance_m integer default null,
  p_sort text default 'newest',
  p_free_only boolean default false,
  p_cursor_price numeric default null,
  p_cursor_id uuid default null
)
returns setof public.public_listings
language plpgsql stable set search_path = '' as $$
declare
  v_text text := nullif(public.f_unaccent(left(btrim(coalesce(p_query, '')), 100)), '');
  v_like text;
  v_short text;
  v_sort text := case when p_sort in ('price_asc', 'price_desc') then p_sort else 'newest' end;
  v_key text;
  v_order text;
  v_cursor text;
begin
  if cardinality(p_categories) = 0 then
    p_categories := null;
  end if;
  -- Chuỗi < 3 ký tự không có trigram cho LIKE → index trả mọi dòng (giải thích ở migration 20261106110000_public_rpc_perf).
  if v_text is not null and char_length(v_text) >= 3 then
    v_like := '%' || replace(replace(replace(v_text, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  elsif v_text ~ '[^\x01-\x7f]' then
    v_short := v_text;
  end if;

  -- Thứ tự + điều kiện cursor là chuỗi cố định (không ghép giá trị người dùng); giá trị cursor đi qua USING.
  if v_sort = 'newest' then
    v_order := 'v.created_at desc';
    v_cursor := '($12 is null or v.created_at < $12)';
  else
    v_key := case v_sort
      when 'price_asc' then 'coalesce(case when v.price_type = ''free'' then 0 else v.price end, 1e15)'
      else 'coalesce(case when v.price_type = ''free'' then 0 else v.price end, -1)' end;
    v_order := v_key || case v_sort when 'price_asc' then ' asc' else ' desc' end || ', v.created_at desc, v.id desc';
    v_cursor := '($12 is null or $16 is null or $17 is null or ' || v_key
      || case v_sort when 'price_asc' then ' > ' else ' < ' end || '$16 or (' || v_key || ' = $16 and (v.created_at < $12'
      || ' or (v.created_at = $12 and v.id < $17))))';
  end if;

  return query execute format($q$
    select v.*
    from public.public_listings v
    where v.status = 'active' and not v.is_expired
      and ($1 is null or v.category = any ($1))
      and ($2 is null
           or v.search_vector @@ plainto_tsquery('simple', $2)
           or $2 operator(extensions.<%%) v.title_search
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
      and (not $15 or v.price_type = 'free')
      and %s
    order by %s
    limit $13
  $q$, v_cursor, v_order)
  using p_categories, v_text, v_like, p_site, p_lat, p_lng,
        least(greatest(coalesce(p_radius_m, 10000), 100), 50000),
        case when p_max_distance_m is null then null else least(greatest(p_max_distance_m, 100), 50000) end,
        p_price_min, p_price_max, p_attributes, p_cursor,
        least(greatest(coalesce(p_limit, 20), 1), 50), v_short,
        coalesce(p_free_only, false), p_cursor_price, p_cursor_id;
end;
$$;
comment on function public.search_listings(public.listing_category[], text, text, double precision, double precision, integer,
  numeric, numeric, jsonb, integer, timestamptz, integer, text, boolean, numeric, uuid) is
  'Tìm tin active (public_listings): danh mục, từ khoá, khu, bán kính trên toạ độ đã làm tròn, khoảng cách tới khu, giá, attributes, cho tặng; sắp newest (cursor created_at) | price_asc | price_desc (cursor giá + created_at + id, tin thoả thuận xếp cuối). Kế hoạch theo giá trị thật (EXECUTE USING).';

revoke execute on function public.search_listings(public.listing_category[], text, text, double precision, double precision, integer,
  numeric, numeric, jsonb, integer, timestamptz, integer, text, boolean, numeric, uuid) from public;
grant execute on function public.search_listings(public.listing_category[], text, text, double precision, double precision, integer,
  numeric, numeric, jsonb, integer, timestamptz, integer, text, boolean, numeric, uuid) to anon, authenticated;
