-- Đo RPC công khai trên ~50.000 tin giả (docs/plan/backend.md tuần 11: mọi RPC công khai < 50 ms p95).
-- CHỈ chạy trên local, ngay sau `supabase db reset` (cần seed 500 tin); chạy xong `supabase db reset` lại để bỏ tin giả:
--   docker exec -i supabase_db_hp-mobile psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/perf/50k_explain.sql
-- Phần 1 nạp tin giả và COMMIT rồi VACUUM ANALYZE (đo như dữ liệu thật đã ổn định — tin chưa commit / chưa vacuum làm
-- số đo chậm gấp nhiều lần). Trigger webhook / kiểm duyệt tắt trong lúc nạp. Phần 2 đo trong transaction rồi ROLLBACK.
-- Mỗi truy vấn chạy 20 lần với tham số khác nhau, in p50 / p95 / max (ms) và kế hoạch vài truy vấn (vai trò anon).
\if :{?skip_load}
\else
begin;
set local statement_timeout = '15min';

alter table public.listings disable trigger trg_listings_moderate;
alter table public.listings disable trigger trg_listings_queue;
alter table public.listings disable trigger trg_listings_revalidate;
alter table public.listings disable trigger trg_listings_match_lost_found;
alter table public.listings disable trigger trg_listings_images_min;

-- 500 tin seed × 100 bản: ngày đăng rải 60 ngày, vị trí lệch ≤ ~5 km, 85 % active, giá ± 50 %.
insert into public.listings (owner_id, category, status, title, description, price, price_type, attributes, site, location,
                             address_text, images, lang, view_count, expires_at, created_at)
select l.owner_id, l.category,
       (case when random() < 0.85 then 'active' when random() < 0.5 then 'sold' else 'expired' end)::public.listing_status,
       l.title || ' ' || g, l.description,
       case when l.price is null then null else round(l.price * (0.5 + random())) end,
       l.price_type, l.attributes, l.site,
       case when l.location is null then null
            else extensions.st_setsrid(extensions.st_makepoint(
                   extensions.st_x(l.location::extensions.geometry) + (random() - 0.5) * 0.09,
                   extensions.st_y(l.location::extensions.geometry) + (random() - 0.5) * 0.09), 4326)::extensions.geography end,
       l.address_text, l.images, l.lang, (random() * 200)::int,
       now() + (random() * 30 || ' days')::interval,
       now() - (random() * 60 || ' days')::interval
from public.listings l
cross join generate_series(1, 100) g
where l.deleted_at is null;

alter table public.listings enable trigger trg_listings_moderate;
alter table public.listings enable trigger trg_listings_queue;
alter table public.listings enable trigger trg_listings_revalidate;
alter table public.listings enable trigger trg_listings_match_lost_found;
alter table public.listings enable trigger trg_listings_images_min;
commit;
vacuum analyze public.listings;
\endif

begin;

select category, count(*) filter (where status = 'active') as active, count(*) as total
from public.listings group by 1 order by 1;

create temp table perf_result (name text, ms numeric[]) on commit drop;

create function pg_temp.bench(p_name text, p_sql text[]) returns void language plpgsql as $$
declare
  v_t timestamptz;
  v_ms numeric[] := '{}';
  v_q text;
begin
  -- 1 lượt làm nóng
  execute 'select count(*) from (' || p_sql[1] || ') x';
  foreach v_q in array p_sql loop
    v_t := clock_timestamp();
    execute 'select count(*) from (' || v_q || ') x';
    v_ms := v_ms || round(extract(epoch from clock_timestamp() - v_t)::numeric * 1000, 2);
  end loop;
  insert into perf_result values (p_name, v_ms);
end;
$$;

-- Tham số mẫu
create temp table perf_slug on commit drop as
  select slug, id from public.listings where status = 'active' order by random() limit 20;

grant select on perf_slug to anon;
grant execute on function pg_temp.bench(text, text[]) to anon;
grant select, insert on perf_result to anon;

set local role anon;

select pg_temp.bench('search_listings: mới nhất (không lọc)',
  array(select 'select * from public.search_listings()' from generate_series(1, 20)));
select pg_temp.bench('search_listings: 1 danh mục',
  array(select format('select * from public.search_listings(p_categories => array[%L]::public.listing_category[])', c)
        from unnest(enum_range(null::public.listing_category)) c, generate_series(1, 2) limit 20));
select pg_temp.bench('search_listings: danh mục + cursor trang 3',
  array(select format('select * from public.search_listings(p_categories => array[%L]::public.listing_category[], p_cursor => now() - interval ''%s days'')',
                      c, d)
        from unnest(enum_range(null::public.listing_category)) c, (values (5), (20)) v(d) limit 20));
select pg_temp.bench('search_listings: từ khoá',
  array(select format('select * from public.search_listings(p_query => %L)', q)
        from unnest(array['xe', 'tủ lạnh', 'phòng', 'thợ hàn', 'ví', 'điện thoại', 'bàn', 'giày', 'nhà', 'laptop',
                          '冰箱', 'room', 'xe máy honda', 'ca đêm', 'máy giặt', 'quạt', 'bếp', 'tivi', 'chìa khoá', 'áo']) q));
select pg_temp.bench('search_listings: trong bán kính 3 km + danh mục trọ',
  array(select format('select * from public.search_listings(p_categories => array[''room_rent'']::public.listing_category[], p_lat => %s, p_lng => %s, p_radius_m => 3000)',
                      15.385 + (g % 5) * 0.004, 108.822 - (g % 4) * 0.004) from generate_series(1, 20) g));
select pg_temp.bench('search_listings: khoảng cách tới khu ≤ 5 km',
  array(select format('select * from public.search_listings(p_site => %L, p_max_distance_m => 5000)', s)
        from unnest(array['hoa_phat_dung_quat', 'cang_dung_quat', 'vsip_quang_ngai', 'hyundai_eco_vina']) s, generate_series(1, 5)));
select pg_temp.bench('search_listings: lọc giá',
  array(select format('select * from public.search_listings(p_categories => array[''pass_home'']::public.listing_category[], p_price_min => %s, p_price_max => %s)',
                      g * 100000, g * 100000 + 2000000) from generate_series(1, 20) g));
select pg_temp.bench('get_listing_by_slug',
  array(select format('select * from public.get_listing_by_slug(%L)', slug) from perf_slug));
select pg_temp.bench('similar_listings',
  array(select format('select * from public.similar_listings(%L::uuid)', id) from perf_slug));
select pg_temp.bench('home_feed (khách)',
  array(select format('select * from public.home_feed(%L)', s)
        from unnest(array['hoa_phat_dung_quat', 'cang_dung_quat', null, 'vsip_quang_ngai']) s, generate_series(1, 5)));
select pg_temp.bench('sitemap_listings',
  array(select format('select * from public.sitemap_listings(%s)', 1 + g % 2) from generate_series(1, 20) g));
select pg_temp.bench('public_listings: danh sách theo danh mục',
  array(select format('select * from public.public_listings where category = %L order by created_at desc limit 20', c)
        from unnest(enum_range(null::public.listing_category)) c, generate_series(1, 2) limit 20));
select pg_temp.bench('public_stats',
  array(select 'select * from public.public_stats()' from generate_series(1, 20)));

reset role;

select name,
       (select percentile_cont(0.5) within group (order by m) from unnest(ms) m)::numeric(10, 2) as p50_ms,
       (select percentile_cont(0.95) within group (order by m) from unnest(ms) m)::numeric(10, 2) as p95_ms,
       (select max(m) from unnest(ms) m) as max_ms
from perf_result order by p95_ms desc;

-- Kế hoạch các truy vấn nặng nhất (anon)
set local role anon;
explain (analyze, buffers, costs off, timing off, summary on)
  select * from public.search_listings(p_query => 'tủ lạnh');
explain (analyze, buffers, costs off, timing off, summary on)
  select * from public.search_listings(p_categories => array['room_rent']::public.listing_category[], p_lat => 15.385, p_lng => 108.822, p_radius_m => 3000);
explain (analyze, buffers, costs off, timing off, summary on)
  select * from public.search_listings(p_site => 'hoa_phat_dung_quat', p_max_distance_m => 5000);
explain (analyze, buffers, costs off, timing off, summary on)
  select * from public.home_feed('hoa_phat_dung_quat');
reset role;

rollback;
