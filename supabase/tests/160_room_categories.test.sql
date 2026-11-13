-- Loại trọ mới Nhà nguyên căn / Căn hộ – KTX (migration 20261113090000) + luật ≥ 3 ảnh cho mọi loại room_* (20261113100000)
-- + view site_locations (20261113110000).
-- 4 vai trò: anon, user, bị cấm, moderator.
begin;
\ir _helpers.psql
select plan(11);

select tests.create_user('rm_owner');
select tests.create_user('rm_banned');
select tests.ban_user('rm_banned');
select tests.create_user('rm_mod', 'moderator');

-- Dữ liệu chuẩn bị (postgres): mỗi loại mới một tin công khai.
insert into public.listings (id, owner_id, category, title, status, site, price, price_type, images) values
  ('e2000000-0000-4000-8000-000000000001', tests.get_uid('rm_owner'), 'room_house', 'Nhà nguyên căn qprm 2 phòng ngủ', 'active',
   'hoa_phat_dung_quat', 3500000, 'fixed', array['a/b/1.webp', 'a/b/2.webp', 'a/b/3.webp']),
  ('e2000000-0000-4000-8000-000000000002', tests.get_uid('rm_owner'), 'room_apartment', 'Ký túc xá qprm giường tầng', 'active',
   'hoa_phat_dung_quat', 600000, 'fixed', array['a/b/1.webp', 'a/b/2.webp', 'a/b/3.webp']);

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select is((select count(*)::int from public.search_listings(p_categories => array['room_house', 'room_apartment']::public.listing_category[],
  p_query => 'qprm')), 2, 'anon: thấy tin Nhà nguyên căn + Căn hộ / KTX');
select ok((select count(*) from public.site_locations where lat between -90 and 90 and lng between -180 and 180) >= 1,
  'anon: đọc toạ độ khu làm việc (site_locations)');
select is((select count(*)::int from public.site_locations s join public.sites x on x.code = s.code where not x.is_active), 0,
  'site_locations: chỉ khu đang hoạt động');

-- ── user ────────────────────────────────────────────────────────────────────────
select tests.authenticate_as('rm_owner');
select throws_ok(format($$ insert into public.listings (owner_id, category, title, price, images) values ('%s', 'room_house', 'Nhà 1 ảnh qprm', 3000000,
                        array['%s/r1/0.webp']) $$, tests.get_uid('rm_owner'), tests.get_uid('rm_owner')),
  'P0001', 'images_min', 'nhà nguyên căn: đăng công khai cần ≥ 3 ảnh');
select throws_ok(format($$ insert into public.listings (owner_id, category, title, price, images) values ('%s', 'room_apartment', 'KTX 2 ảnh qprm', 500000,
                        array['%s/r2/0.webp', '%s/r2/1.webp']) $$, tests.get_uid('rm_owner'), tests.get_uid('rm_owner'), tests.get_uid('rm_owner')),
  'P0001', 'images_min', 'căn hộ / KTX: đăng công khai cần ≥ 3 ảnh');
select lives_ok(format($$ insert into public.listings (owner_id, category, title, price, status) values ('%s', 'room_house', 'Nháp nhà qprm', 3000000, 'draft') $$,
                       tests.get_uid('rm_owner')), 'loại trọ mới: nháp chưa cần ảnh');
select lives_ok(format($$ insert into public.listings (owner_id, category, title, price, status, images) values ('%s', 'room_apartment', 'KTX đủ ảnh qprm', 500000,
                        'active', array['%s/r3/0.webp', '%s/r3/1.webp', '%s/r3/2.webp']) $$,
                       tests.get_uid('rm_owner'), tests.get_uid('rm_owner'), tests.get_uid('rm_owner'), tests.get_uid('rm_owner')),
  'căn hộ / KTX: đủ 3 ảnh thì đăng được');
select lives_ok(format($$ insert into public.listings (owner_id, category, title, price, status) values ('%s', 'pass_home', 'Bàn ghế qprm', 100000, 'active') $$,
                       tests.get_uid('rm_owner')), 'không phải trọ: không cần 3 ảnh');

-- ── bị cấm ──────────────────────────────────────────────────────────────────────
select tests.authenticate_as('rm_banned');
select throws_ok(format($$ insert into public.listings (owner_id, category, title, price, status) values ('%s', 'room_house', 'Nhà qprm', 3000000, 'draft') $$,
                        tests.get_uid('rm_banned')), '42501', null, 'bị cấm: không đăng tin loại trọ mới');

-- ── moderator ───────────────────────────────────────────────────────────────────
select tests.authenticate_as('rm_mod');
select is((select count(*)::int from public.search_listings(p_categories => array['room_house']::public.listing_category[], p_query => 'qprm')), 1,
  'moderator: lọc theo Nhà nguyên căn');
select ok((select count(*) from public.listings where category = 'room_apartment' and title like '%qprm%') >= 1, 'moderator: đọc bảng gốc loại mới');

select * from finish();
rollback;
