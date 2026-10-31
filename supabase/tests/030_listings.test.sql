-- listings (RLS + guard + slug), public_listings (che PII), RPC công khai, listing_views, search_logs, Storage.
-- 4 vai trò: anon, user (chủ / người khác), bị cấm, moderator.
begin;
\ir _helpers.psql
select plan(47);

select tests.create_user('user_a');
select tests.create_user('user_b');
select tests.create_user('bad');
select tests.create_user('mod', 'moderator');

-- Dữ liệu (quyền postgres): 1 tin active của user_a có vị trí chính xác, 1 nháp, 1 tin của người sắp bị cấm.
insert into public.listings (id, owner_id, category, title, description, price, site, location, attributes)
values
  ('a0000000-0000-4000-8000-000000000001', tests.get_uid('user_a'), 'pass_ppe', 'Giày bảo hộ zxqtest size 42',
   'Còn mới', 150000, 'hoa_phat_dung_quat', 'SRID=4326;POINT(108.82345 15.38765)', '{"condition":"used","size":"42"}'),
  ('a0000000-0000-4000-8000-000000000002', tests.get_uid('user_a'), 'pass_ppe', 'Nháp zxqtest', null, null,
   null, null, '{}'),
  ('a0000000-0000-4000-8000-000000000003', tests.get_uid('bad'), 'pass_ppe', 'Tin người bị cấm zxqtest', null, 1000,
   null, null, '{}');
update public.listings set status = 'draft' where id = 'a0000000-0000-4000-8000-000000000002';
select tests.ban_user('bad');

-- ── trigger slug / short_id / expires_at ───────────────────────────────────────
select matches((select short_id from public.listings where id = 'a0000000-0000-4000-8000-000000000001'), '^[0-9a-z]{6}$',
  'trigger: sinh short_id 6 ký tự base36');
select is((select slug from public.listings where id = 'a0000000-0000-4000-8000-000000000001'),
  'giay-bao-ho-zxqtest-size-42-' || (select short_id from public.listings where id = 'a0000000-0000-4000-8000-000000000001'),
  'trigger: slug = slugify(title) + short_id');
select ok((select expires_at between now() + interval '29 days' and now() + interval '31 days'
           from public.listings where id = 'a0000000-0000-4000-8000-000000000001'),
  'trigger: pass hết hạn mặc định sau 30 ngày');

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select id from public.listings limit 1 $$, '42501', null, 'anon: không đọc bảng gốc listings');
select is((select count(*)::int from public.public_listings where title like '%zxqtest%'), 1,
  'anon: chỉ thấy tin active, không thấy nháp / tin của người bị cấm');
select is((select count(*)::int from information_schema.columns
           where table_schema = 'public' and table_name = 'public_listings'
             and column_name in ('phone', 'location', 'full_name', 'deleted_at')), 0,
  'public_listings: không có cột SĐT / vị trí chính xác / họ tên đầy đủ');
select ok((select lat <> 15.38765 and abs(lat - 15.38765) <= 0.0015 and abs(lng - 108.82345) <= 0.0015
           from public.public_listings where id = 'a0000000-0000-4000-8000-000000000001'),
  'public_listings: vị trí làm tròn ~300 m (khác vị trí thật, lệch ≤ 0.0015°)');
select is((select owner_name from public.public_listings where id = 'a0000000-0000-4000-8000-000000000001'), 'user_a T.',
  'public_listings: tên người đăng rút gọn');
select is((select count(*)::int from public.search_listings(p_limit => 1000)), 50, 'search_listings: p_limit bị kẹp 50');
select ok(exists (select 1 from public.search_listings(p_query => 'giay bao ho zxqtest')
           where id = 'a0000000-0000-4000-8000-000000000001'), 'search_listings: tìm không dấu ra tin có dấu');
select is((select count(*)::int from public.search_listings(p_query => 'zxqtest',
           p_attributes => '{"condition":"used"}')), 1, 'search_listings: lọc theo attributes');
select is((select count(*)::int from public.search_listings(p_query => 'zxqtest', p_price_max => 100000)), 0,
  'search_listings: lọc giá tối đa');
select is((select id from public.get_listing_by_slug('ten-cu-bat-ky-' ||
           (select short_id from public.public_listings where id = 'a0000000-0000-4000-8000-000000000001'))),
  'a0000000-0000-4000-8000-000000000001'::uuid, 'get_listing_by_slug: khớp theo short_id (slug cũ vẫn mở)');
select is((select count(*)::int from public.get_listing_by_slug('khong-ton-tai-zzzzzz')), 0,
  'get_listing_by_slug: không thấy → 0 dòng');
select throws_ok($$ select public.record_listing_view('a0000000-0000-4000-8000-000000000001') $$, '42501', null,
  'anon: không ghi lượt xem');
select lives_ok($$ select public.log_search('giày bảo hộ', 'pass_ppe', 3) $$, 'anon: ghi từ khoá tìm kiếm');
select throws_ok($$ select id from public.search_logs $$, '42501', null, 'anon: không đọc search_logs');

-- ── user (chủ tin) ──────────────────────────────────────────────────────────────
select tests.authenticate_as('user_a');
select lives_ok($$ insert into public.listings (owner_id, category, title) values (auth.uid(), 'job_main', 'Tuyển zxq thợ hàn') $$,
  'user: đăng tin của mình');
select ok((select expires_at between now() + interval '13 days' and now() + interval '15 days'
           from public.listings where title = 'Tuyển zxq thợ hàn'), 'trigger: việc làm hết hạn sau 14 ngày');
select throws_ok($$ insert into public.listings (owner_id, category, title) values (tests.get_uid('user_b'), 'pass_home', 'x') $$,
  '42501', null, 'user: không đăng thay người khác');
select throws_ok($$ insert into public.listings (owner_id, category, title, status) values (auth.uid(), 'pass_home', 'x', 'pending_review') $$,
  '42501', null, 'guard: không tự đặt trạng thái pending_review');
select is((select count(*)::int from public.listings where title like '%zxqtest%'), 2, 'user: thấy mọi tin của mình (cả nháp)');
select lives_ok($$ update public.listings set title = 'Giày bảo hộ zxqtest size 43' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'user: sửa tin của mình');
select ok((select slug like 'giay-bao-ho-zxqtest-size-43-%' and slug like '%' || short_id from public.listings
           where id = 'a0000000-0000-4000-8000-000000000001'), 'trigger: đổi tiêu đề → slug mới, giữ short_id');
select throws_ok($$ update public.listings set view_count = 9999 where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'guard: không tự đổi view_count');
select throws_ok($$ update public.listings set short_id = 'zzzzzz', status = 'expired' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'guard: không tự đặt expired');

-- ── user khác ───────────────────────────────────────────────────────────────────
select tests.authenticate_as('user_b');
select is((select count(*)::int from public.listings where owner_id = tests.get_uid('user_a')), 0,
  'user khác: không thấy bảng gốc tin của người khác');
select is((select count(*)::int from public.public_listings where owner_id = tests.get_uid('user_a') and title like '%zxqtest%'), 1,
  'user khác: thấy tin qua public_listings');
update public.listings set title = 'bị sửa trộm' where id = 'a0000000-0000-4000-8000-000000000001';
select is((select title from public.public_listings where id = 'a0000000-0000-4000-8000-000000000001'), 'Giày bảo hộ zxqtest size 43',
  'user khác: không sửa được tin của người khác');
select public.record_listing_view('a0000000-0000-4000-8000-000000000001');
select public.record_listing_view('a0000000-0000-4000-8000-000000000001');
select is((select view_count from public.public_listings where id = 'a0000000-0000-4000-8000-000000000001'), 1,
  'record_listing_view: 1 lượt / người / ngày');
select is((select count(*)::int from public.listing_views), 1, 'listing_views: chỉ thấy lượt xem của mình');
insert into public.blocks (blocked_id) values (tests.get_uid('user_a'));
select is((select count(*)::int from public.public_listings where owner_id = tests.get_uid('user_a')), 0,
  'chặn: người chặn không thấy tin của người bị chặn');
select tests.authenticate_as('user_a');
select is((select count(*)::int from public.public_listings where owner_id = tests.get_uid('user_b')), 0,
  'chặn: người bị chặn cũng không thấy tin của người chặn (hai chiều)');
select is((select count(*)::int from public.listing_views), 0, 'listing_views: không thấy lượt xem của người khác');

-- ── bị cấm ──────────────────────────────────────────────────────────────────────
select tests.authenticate_as('bad');
select throws_ok($$ insert into public.listings (owner_id, category, title) values (auth.uid(), 'pass_home', 'x') $$,
  '42501', null, 'bị cấm: không đăng tin');
select throws_ok($$ update public.listings set status = 'active', title = 'mở lại' where id = 'a0000000-0000-4000-8000-000000000003' $$,
  '42501', null, 'bị cấm: không mở / sửa tin đang đăng');
select lives_ok($$ update public.listings set status = 'closed' where id = 'a0000000-0000-4000-8000-000000000003' $$,
  'bị cấm: vẫn đóng được tin của mình');

-- ── moderator ───────────────────────────────────────────────────────────────────
select tests.authenticate_as('mod');
select is((select count(*)::int from public.listings where title like '%zxqtest%'), 3, 'moderator: thấy mọi tin (cả nháp, tin bị cấm)');
select lives_ok($$ update public.listings set status = 'pending_review' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'moderator: chuyển tin về chờ duyệt');
select ok((select count(*) from public.search_logs) >= 1, 'moderator: đọc search_logs');

select tests.authenticate_as('user_a');
select throws_ok($$ update public.listings set status = 'active' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'guard: chủ tin không tự mở lại tin đang chờ duyệt');
select lives_ok($$ update public.listings set status = 'closed' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'user: đóng tin đang chờ duyệt');
select tests.clear_auth();
select is((select count(*)::int from public.search_listings(p_query => 'zxqtest')), 0, 'anon: tin không còn active thì ẩn khỏi danh sách');

-- ── Storage ─────────────────────────────────────────────────────────────────────
select tests.authenticate_as('user_a');
select lives_ok(format($$ insert into storage.objects (bucket_id, name) values ('listing-images', '%s/l1/0.webp') $$, tests.get_uid('user_a')),
  'storage: upload ảnh vào thư mục của mình');
select throws_ok(format($$ insert into storage.objects (bucket_id, name) values ('listing-images', '%s/l1/0.webp') $$, tests.get_uid('user_b')),
  '42501', null, 'storage: không upload vào thư mục người khác');
select lives_ok(format($$ insert into storage.objects (bucket_id, name) values ('avatars', '%s/1.webp') $$, tests.get_uid('user_a')),
  'storage: upload avatar của mình');
select tests.authenticate_as('bad');
select throws_ok(format($$ insert into storage.objects (bucket_id, name) values ('avatars', '%s/1.webp') $$, tests.get_uid('bad')),
  '42501', null, 'storage: bị cấm không upload');

select * from finish();
rollback;
