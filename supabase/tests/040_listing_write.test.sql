-- Ghi tin + kiểm duyệt tự động (20261101090000) + vòng đời public_listings, sitemap, stats (20261101100000).
-- Vai trò: anon, user (tài khoản cũ / mới), người khác, bị cấm, moderator, admin.
begin;
\ir _helpers.psql
select plan(44);

select tests.create_user('old_user');
select tests.create_user('new_user');
select tests.create_user('other');
select tests.create_user('bad');
select tests.ban_user('bad');
select tests.create_user('mod', 'moderator');
select tests.create_user('boss', 'admin');
-- old_user là tài khoản 30 ngày tuổi (không bị luật "tài khoản < 7 ngày")
update public.profiles set created_at = now() - interval '30 days' where id = tests.get_uid('old_user');
update public.profiles set created_at = now() - interval '30 days' where id = tests.get_uid('other');
update public.profiles set phone = '84911112222' where id = tests.get_uid('old_user');

-- ── kiểm duyệt tự động ──────────────────────────────────────────────────────────
select tests.authenticate_as('old_user');
insert into public.listings (id, owner_id, category, title, price)
values ('b0000000-0000-4000-8000-000000000001', auth.uid(), 'pass_home', 'Tủ lạnh mini zxqw', 900000);
select is((select status::text from public.listings where id = 'b0000000-0000-4000-8000-000000000001'), 'active',
  'kiểm duyệt: tài khoản cũ, nội dung sạch → active ngay');
insert into public.listings (id, owner_id, category, title, description)
values ('b0000000-0000-4000-8000-000000000002', auth.uid(), 'job_main', 'Tuyển thợ hàn zxqw', 'Nộp phi ho so 200k truoc khi di lam');
select is((select status::text from public.listings where id = 'b0000000-0000-4000-8000-000000000002'), 'pending_review',
  'kiểm duyệt: việc làm có "phí hồ sơ" (gõ không dấu) → chờ duyệt');
select is((select moderation_reasons from public.listings where id = 'b0000000-0000-4000-8000-000000000002'), array['keyword'],
  'kiểm duyệt: ghi lý do keyword');
insert into public.listings (id, owner_id, category, title)
values ('b0000000-0000-4000-8000-000000000003', auth.uid(), 'pass_home', 'Bán đồ cá độ bóng đá zxqw');
insert into public.listings (id, owner_id, category, title)
values ('b0000000-0000-4000-8000-000000000007', auth.uid(), 'pass_home', 'Bán cá đồng tươi zxqw');
select is((select status::text from public.listings where id = 'b0000000-0000-4000-8000-000000000003'), 'rejected',
  'kiểm duyệt: từ khoá cấm → bị từ chối ngay');
select is((select status::text from public.listings where id = 'b0000000-0000-4000-8000-000000000007'), 'active',
  'kiểm duyệt: so theo ranh giới từ ("cá đồng" không khớp "cá độ")');
insert into public.listings (id, owner_id, category, title)
values ('b0000000-0000-4000-8000-000000000004', auth.uid(), 'pass_home', 'Phí hồ sơ zxqw');
select is((select status::text from public.listings where id = 'b0000000-0000-4000-8000-000000000004'), 'active',
  'kiểm duyệt: từ khoá chỉ áp cho việc làm không chặn pass đồ');
select is((select count(*)::int from public.moderation_queue), 0, 'user: không thấy hàng chờ kiểm duyệt (RLS)');
select throws_ok($$ update public.listings set moderation_reasons = '{}' where id = 'b0000000-0000-4000-8000-000000000002' $$,
  '42501', null, 'guard: chủ tin không tự xoá lý do kiểm duyệt');
-- sửa tin đang active thành nội dung có từ khoá → vào lại hàng chờ
update public.listings set description = 'Cần đặt cọc trước 500k' where id = 'b0000000-0000-4000-8000-000000000001';
select is((select status::text from public.listings where id = 'b0000000-0000-4000-8000-000000000001'), 'pending_review',
  'kiểm duyệt: sửa tin active thêm từ khoá → chờ duyệt lại');

select tests.authenticate_as('new_user');
insert into public.listings (id, owner_id, category, title, price)
values ('b0000000-0000-4000-8000-000000000005', auth.uid(), 'pass_ppe', 'Giày bảo hộ zxqw', 200000);
select is((select status::text from public.listings where id = 'b0000000-0000-4000-8000-000000000005'), 'pending_review',
  'kiểm duyệt: tài khoản < 7 ngày → chờ duyệt');
insert into public.listings (owner_id, category, title, status) values (auth.uid(), 'pass_ppe', 'Nháp zxqw', 'draft');
select is((select status::text from public.listings where title = 'Nháp zxqw'), 'draft', 'kiểm duyệt: nháp không bị đưa vào hàng chờ');

-- giá < 30% trung vị (seed pass_vehicle: ≥ 5 tin giá vài triệu)
select tests.authenticate_as('other');
insert into public.listings (id, owner_id, category, title, price)
values ('b0000000-0000-4000-8000-000000000006', auth.uid(), 'pass_vehicle', 'Xe máy giá rẻ zxqw', 100000);
select is((select moderation_reasons from public.listings where id = 'b0000000-0000-4000-8000-000000000006'), array['low_price'],
  'kiểm duyệt: giá < 30% trung vị 30 ngày → chờ duyệt (low_price)');

-- giới hạn 10 tin / 24 giờ
select lives_ok($$ insert into public.listings (owner_id, category, title, status)
  select auth.uid(), 'pass_home', 'Tin hàng loạt zxqw ' || g, 'draft' from generate_series(1, 9) g $$, 'rate: tới 10 tin / ngày được');
select throws_ok($$ insert into public.listings (owner_id, category, title, status) values (auth.uid(), 'pass_home', 'Tin thứ 11 zxqw', 'draft') $$,
  'P0001', 'rate_limited', 'rate: tin thứ 11 trong 24 giờ bị chặn');

-- ── hàng chờ + duyệt ────────────────────────────────────────────────────────────
reset role;
select is((select count(*)::int from public.moderation_queue
           where listing_id in ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
                                'b0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000006') and status = 'pending'), 4,
  'hàng chờ: mỗi tin chờ duyệt có 1 dòng pending');
select is((select status from public.moderation_queue where listing_id = 'b0000000-0000-4000-8000-000000000003'), 'rejected',
  'hàng chờ: tin bị từ chối tự động được ghi lại (rejected)');

select tests.authenticate_as('old_user');
select throws_ok($$ select public.review_listing('b0000000-0000-4000-8000-000000000002', true) $$, '42501', null,
  'review_listing: user không duyệt được');
select tests.authenticate_as('mod');
select is((select count(*)::int from public.moderation_queue where status = 'pending' and listing_id::text like 'b0000000%'), 4,
  'moderator: đọc hàng chờ');
select lives_ok($$ select public.review_listing('b0000000-0000-4000-8000-000000000002', true, 'đã gọi xác minh') $$,
  'moderator: duyệt tin');
select lives_ok($$ select public.review_listing('b0000000-0000-4000-8000-000000000005', false, 'thiếu ảnh') $$,
  'moderator: từ chối tin');
select throws_ok($$ select public.review_listing('b0000000-0000-4000-8000-000000000004', true) $$, 'P0001', 'conflict',
  'review_listing: tin không chờ duyệt → conflict');
reset role;
select is((select status::text from public.listings where id = 'b0000000-0000-4000-8000-000000000002'), 'active', 'duyệt → active');
select is((select status from public.moderation_queue where listing_id = 'b0000000-0000-4000-8000-000000000002'), 'approved',
  'duyệt → hàng chờ approved, có người duyệt');
select is((select array_agg(action order by id) from public.audit_log where target_id::text like 'b0000000%'),
  array['listing.approve', 'listing.reject'], 'duyệt / từ chối ghi audit_log');
select is((select array_agg(type order by type) from public.notifications where data->'params'->>'id' like 'b0000000%'),
  array['listing_approved', 'listing_rejected'], 'duyệt / từ chối gửi thông báo cho chủ tin');
select is((select title_key from public.notifications where type = 'listing_approved' and data->'params'->>'id' = 'b0000000-0000-4000-8000-000000000002'),
  'listing_approved.title', 'thông báo lưu khoá i18n (ns push), không lưu chữ');

-- ── gia hạn ─────────────────────────────────────────────────────────────────────
select tests.authenticate_as('old_user');
select throws_ok($$ select public.renew_listing('b0000000-0000-4000-8000-000000000004') $$, 'P0001', 'too_early',
  'renew: còn > 3 ngày → too_early');
reset role;
update public.listings set expires_at = now() + interval '1 day' where id = 'b0000000-0000-4000-8000-000000000004';
select tests.authenticate_as('old_user');
select ok((select public.renew_listing('b0000000-0000-4000-8000-000000000004') > now() + interval '29 days'),
  'renew: 3 ngày cuối → gia hạn thêm 30 ngày');
select tests.authenticate_as('other');
select throws_ok($$ select public.renew_listing('b0000000-0000-4000-8000-000000000004') $$, 'P0001', 'not_found',
  'renew: không gia hạn tin người khác');
select tests.authenticate_as('bad');
select throws_ok($$ select public.renew_listing('b0000000-0000-4000-8000-000000000004') $$, 'P0001', 'banned', 'renew: bị cấm');

-- ── reveal_contact ──────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select public.reveal_contact('b0000000-0000-4000-8000-000000000004') $$, '42501', null,
  'reveal_contact: khách không gọi được');
select tests.authenticate_as('other');
select is(public.reveal_contact('b0000000-0000-4000-8000-000000000004'), '84911112222', 'reveal_contact: người đăng nhập thấy SĐT');
select throws_ok($$ select public.reveal_contact('b0000000-0000-4000-8000-000000000003') $$, 'P0001', 'not_found',
  'reveal_contact: tin không còn hiện → not_found');
select tests.authenticate_as('bad');
select throws_ok($$ select public.reveal_contact('b0000000-0000-4000-8000-000000000004') $$, 'P0001', 'banned',
  'reveal_contact: bị cấm không xem SĐT');
select tests.authenticate_as('other');
select throws_ok($$ select public.reveal_contact('b0000000-0000-4000-8000-000000000004') from generate_series(1, 20) $$,
  'P0001', 'rate_limited', 'reveal_contact: quá 20 lần / giờ');
reset role;
select ok((select count(*) from public.audit_log where action = 'contact.reveal' and actor_id = tests.get_uid('other')) >= 1,
  'reveal_contact: ghi audit_log');

-- ── vòng đời public_listings ────────────────────────────────────────────────────
select tests.authenticate_as('old_user');
update public.listings set status = 'sold' where id = 'b0000000-0000-4000-8000-000000000004';
select tests.clear_auth();
select is((select status::text from public.get_listing_by_slug((select slug from public.public_listings where id = 'b0000000-0000-4000-8000-000000000004'))),
  'sold', 'public: tin đã bán vẫn mở được theo slug (trang chi tiết hiện nhãn)');
select ok((select inactive_since is not null from public.public_listings where id = 'b0000000-0000-4000-8000-000000000004'),
  'public: tin đã bán có inactive_since (web tính 410 sau 30 ngày)');
select is((select count(*)::int from public.search_listings(p_query => 'zxqw')), 2, 'public: danh sách chỉ có tin active (tin vừa duyệt + tin cá đồng)');
select is((select count(*)::int from public.public_listings where id in ('b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000005')), 0,
  'public: tin bị từ chối không bao giờ công khai');
select ok((select count(*) from public.sitemap_listings(1)) > 0 and (select count(*) from public.sitemap_listings(99)) = 0,
  'sitemap_listings: trang 1 có tin, trang ngoài phạm vi rỗng');
select ok((select users > 0 and listings > 0 and sites = 4 from public.public_stats()), 'public_stats: anon đọc được số đếm');

-- ── banned_keywords ─────────────────────────────────────────────────────────────
select tests.authenticate_as('mod');
select throws_ok($$ insert into public.banned_keywords (keyword) values ('lừa đảo') $$, '42501', null, 'banned_keywords: moderator chỉ đọc');
select tests.authenticate_as('boss');
select lives_ok($$ insert into public.banned_keywords (keyword, action) values ('lừa đảo', 'review') $$, 'banned_keywords: admin thêm từ khoá');

select * from finish();
rollback;
