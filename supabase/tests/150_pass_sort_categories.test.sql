-- Danh mục Pass đồ mới (migration 20261112090000), search_listings sắp theo giá / cho tặng / cursor giá
-- (20261112100000), banner placement app_pass / web_pass (20261112110000). 4 vai trò: anon, user, bị cấm, moderator (+ admin).
begin;
\ir _helpers.psql
select plan(21);

select tests.create_user('ps_owner');
select tests.create_user('ps_user');
select tests.create_user('ps_banned');
select tests.ban_user('ps_banned');
select tests.create_user('ps_mod', 'moderator');
select tests.create_user('ps_admin', 'admin');

-- 6 tin điện lạnh mã qpzt: giá 300k (2 tin trùng giá, khác giờ), 100k, 900k, cho tặng, thoả thuận (không giá).
insert into public.listings (id, owner_id, category, title, status, site, price, price_type, created_at) values
  ('e1000000-0000-4000-8000-000000000001', tests.get_uid('ps_owner'), 'pass_appliance', 'Tủ lạnh qpzt 300k cũ', 'active', 'hoa_phat_dung_quat', 300000, 'fixed', now() - interval '6 hours'),
  ('e1000000-0000-4000-8000-000000000002', tests.get_uid('ps_owner'), 'pass_appliance', 'Máy giặt qpzt 100k', 'active', 'hoa_phat_dung_quat', 100000, 'fixed', now() - interval '5 hours'),
  ('e1000000-0000-4000-8000-000000000003', tests.get_uid('ps_owner'), 'pass_appliance', 'Quạt qpzt cho tặng', 'active', 'hoa_phat_dung_quat', null, 'free', now() - interval '4 hours'),
  ('e1000000-0000-4000-8000-000000000004', tests.get_uid('ps_owner'), 'pass_appliance', 'Điều hoà qpzt 900k', 'active', 'hoa_phat_dung_quat', 900000, 'fixed', now() - interval '3 hours'),
  ('e1000000-0000-4000-8000-000000000005', tests.get_uid('ps_owner'), 'pass_appliance', 'Bình nóng lạnh qpzt thoả thuận', 'active', 'hoa_phat_dung_quat', null, 'negotiable', now() - interval '2 hours'),
  ('e1000000-0000-4000-8000-000000000006', tests.get_uid('ps_owner'), 'pass_appliance', 'Tủ lạnh qpzt 300k mới', 'active', 'hoa_phat_dung_quat', 300000, 'fixed', now() - interval '1 hours');
-- Mỗi danh mục mới đăng được (enum + Zod khớp).
insert into public.listings (owner_id, category, title, status, site, price, price_type) values
  (tests.get_uid('ps_owner'), 'pass_fashion', 'Áo khoác qpzx', 'active', 'hoa_phat_dung_quat', 50000, 'fixed'),
  (tests.get_uid('ps_owner'), 'pass_sport', 'Giày đá bóng qpzx', 'active', 'hoa_phat_dung_quat', 80000, 'fixed'),
  (tests.get_uid('ps_owner'), 'pass_tools', 'Máy khoan qpzx', 'active', 'hoa_phat_dung_quat', 400000, 'fixed'),
  (tests.get_uid('ps_owner'), 'pass_baby', 'Xe đẩy qpzx', 'active', 'hoa_phat_dung_quat', 250000, 'fixed'),
  (tests.get_uid('ps_owner'), 'pass_other', 'Đồ khác qpzx', 'active', 'hoa_phat_dung_quat', 10000, 'fixed');

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select is((select count(*)::int from public.search_listings(p_categories => array['pass_fashion', 'pass_sport', 'pass_tools',
  'pass_baby', 'pass_other']::public.listing_category[], p_query => 'qpzx')), 5, 'anon: thấy tin của 5 danh mục mới');
select is((select count(*)::int from public.search_listings(p_categories => array['pass_appliance']::public.listing_category[],
  p_query => 'qpzt')), 6, 'anon: lọc theo danh mục điện lạnh');

select is(array(select id::text from public.search_listings(p_query => 'qpzt')),
  array['e1000000-0000-4000-8000-000000000006', 'e1000000-0000-4000-8000-000000000005', 'e1000000-0000-4000-8000-000000000004',
        'e1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001'],
  'mặc định (newest): mới nhất trước, như cũ');
select is(array(select id::text from public.search_listings(p_query => 'qpzt', p_sort => 'price_asc')),
  array['e1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000006',
        'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000005'],
  'price_asc: cho tặng (0) đầu, trùng giá thì mới trước, thoả thuận cuối');
select is(array(select id::text from public.search_listings(p_query => 'qpzt', p_sort => 'price_desc')),
  array['e1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000006', 'e1000000-0000-4000-8000-000000000001',
        'e1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000005'],
  'price_desc: đắt nhất đầu, thoả thuận vẫn cuối');
select is(array(select id::text from public.search_listings(p_query => 'qpzt', p_sort => 'xyz', p_limit => 1)),
  array['e1000000-0000-4000-8000-000000000006'], 'p_sort lạ → newest');

-- Cursor giá: trang 1 (2 tin) dừng giữa hai tin cùng 300k → trang 2 lấy tiếp, không trùng không sót.
select is(array(select id::text from public.search_listings(p_query => 'qpzt', p_sort => 'price_asc', p_limit => 3)),
  array['e1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000006'],
  'price_asc trang 1');
select is(array(select id::text from public.search_listings(p_query => 'qpzt', p_sort => 'price_asc', p_limit => 3,
    p_cursor_price => 300000, p_cursor => (select created_at from public.listings where id = 'e1000000-0000-4000-8000-000000000006'),
    p_cursor_id => 'e1000000-0000-4000-8000-000000000006')),
  array['e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000005'],
  'price_asc trang 2 theo cursor (giá, created_at, id): tiếp đúng tin trùng giá');
select is(array(select id::text from public.search_listings(p_query => 'qpzt', p_sort => 'price_desc', p_limit => 10,
    p_cursor_price => -1, p_cursor => (select created_at from public.listings where id = 'e1000000-0000-4000-8000-000000000005'),
    p_cursor_id => 'e1000000-0000-4000-8000-000000000005')),
  array[]::text[], 'price_desc: cursor ở tin thoả thuận cuối → hết');

select is(array(select id::text from public.search_listings(p_query => 'qpzt', p_free_only => true)),
  array['e1000000-0000-4000-8000-000000000003'], 'p_free_only: chỉ tin cho tặng');
select is((select count(*)::int from public.search_listings(p_query => 'qpzt', p_price_min => 200000, p_price_max => 500000,
  p_sort => 'price_desc')), 2, 'khoảng giá 200k–500k kết hợp sắp xếp');
select is((select count(*)::int from public.search_listings(p_sort => 'price_asc', p_limit => 500)), 50, 'p_limit kẹp 50 khi sắp theo giá');

-- ── user / bị cấm / moderator: RPC công khai chạy như nhau ─────────────────────
select tests.authenticate_as('ps_user');
select is((select count(*)::int from public.search_listings(p_query => 'qpzt', p_sort => 'price_asc')), 6, 'user: sắp theo giá');
select tests.authenticate_as('ps_banned');
select is((select count(*)::int from public.search_listings(p_query => 'qpzt', p_sort => 'price_desc')), 6, 'bị cấm: vẫn đọc tin công khai');
select throws_ok($$ insert into public.listings (owner_id, category, title, price, price_type)
  values (tests.get_uid('ps_banned'), 'pass_tools', 'Máy mài qpzx', 100000, 'fixed') $$, '42501', null, 'bị cấm: không đăng tin danh mục mới');
select tests.authenticate_as('ps_mod');
select is((select count(*)::int from public.search_listings(p_query => 'qpzt', p_free_only => true)), 1, 'moderator: lọc cho tặng');

-- ── banner placement mới ────────────────────────────────────────────────────────
select tests.authenticate_as('ps_admin');
select lives_ok($$ insert into public.banners (placement, title, link_url, tone) values ('app_pass', 'Pass đồ qpzb', '/pass-do', 'pass') $$,
  'admin: thêm banner app_pass');
select lives_ok($$ insert into public.banners (placement, title, link_url, tone) values ('web_pass', 'Pass đồ web qpzb', '/pass-do', 'pass') $$,
  'admin: thêm banner web_pass');
select throws_ok($$ insert into public.banners (placement, title) values ('app_bogus', 'x') $$, '23514', null,
  'placement lạ bị CHECK chặn');
select tests.authenticate_as('ps_mod');
select throws_ok($$ insert into public.banners (placement, title) values ('app_pass', 'x') $$, '42501', null, 'moderator: không thêm banner');
select tests.clear_auth();
select is((select count(*)::int from public.banners where placement = 'app_pass' and title like '%qpzb'), 1,
  'anon: đọc banner app_pass đang hiệu lực');

select * from finish();
rollback;
