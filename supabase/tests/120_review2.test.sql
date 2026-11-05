-- Review RLS lần 2 (migration 20261106100000_review2_hardening): mỗi khai thác của người rà thứ hai phải bị chặn.
begin;
\ir _helpers.psql
select plan(30);

select tests.create_user('r2_owner');
select tests.create_user('r2_rep1');
select tests.create_user('r2_rep2');
select tests.create_user('r2_rep3');
select tests.create_user('r2_mod', 'moderator');
select tests.create_user('r2_mod2', 'moderator');
select tests.create_user('r2_badmod', 'moderator');
select tests.create_user('r2_boss', 'admin');
-- Tài khoản cũ (> 7 ngày) để lý do new_account không che kết quả.
update public.profiles set created_at = now() - interval '30 days' where id = tests.get_uid('r2_owner');
update public.profiles set is_banned = true where id = tests.get_uid('r2_badmod');

insert into public.listings (id, owner_id, category, title, description, status) values
  ('e0000000-0000-4000-8000-000000000001', tests.get_uid('r2_owner'), 'pass_home', 'Tủ gỗ zxr2 một', 'mô tả', 'active'),
  ('e0000000-0000-4000-8000-000000000002', tests.get_uid('r2_owner'), 'pass_home', 'Tủ gỗ zxr2 hai', 'mô tả', 'active'),
  ('e0000000-0000-4000-8000-000000000003', tests.get_uid('r2_owner'), 'pass_home', 'Tủ gỗ zxr2 ba', 'mô tả', 'active');

create temp table r2 as select
  (select slug from public.listings where id = 'e0000000-0000-4000-8000-000000000001') as slug1,
  (select slug from public.listings where id = 'e0000000-0000-4000-8000-000000000002') as slug2,
  (select slug from public.listings where id = 'e0000000-0000-4000-8000-000000000003') as slug3;
grant select on r2 to anon, authenticated;

select ok((select published_at is not null and not moderation_hold from public.listings
           where id = 'e0000000-0000-4000-8000-000000000001'), 'tin active: có published_at, không khoá');

-- ── H1: nháp → closed / sold không lên trang công khai ──────────────────────────────
select tests.authenticate_as('r2_owner');
insert into public.listings (id, owner_id, category, title, description, status)
values ('e0000000-0000-4000-8000-000000000010', tests.get_uid('r2_owner'), 'pass_home', 'Nháp zxr2 cấm', 'nội dung xấu', 'draft');
select throws_ok($$ update public.listings set status = 'sold' where id = 'e0000000-0000-4000-8000-000000000010' $$,
  '42501', null, 'H1: nháp → sold bị chặn');
select lives_ok($$ update public.listings set status = 'closed' where id = 'e0000000-0000-4000-8000-000000000010' $$,
  'H1: rút nháp (closed) vẫn được');
select throws_ok($$ update public.listings set published_at = now() where id = 'e0000000-0000-4000-8000-000000000010' $$,
  '42501', null, 'H1: chủ tin không tự đặt published_at');
select throws_ok($$ insert into public.listings (owner_id, category, title, status, published_at)
  values (tests.get_uid('r2_owner'), 'pass_home', 'x zxr2', 'draft', now()) $$, '42501', null, 'H1: không đăng kèm published_at');
select tests.clear_auth();
select is((select count(*)::int from public.public_listings where id = 'e0000000-0000-4000-8000-000000000010'), 0,
  'H1: nháp đã đóng không có trên public_listings');

-- ── H2a: staff ẩn → chủ tin mở lại → vào hàng chờ ─────────────────────────────────
select tests.authenticate_as('r2_mod');
select lives_ok($$ select public.staff_set_listing_status('e0000000-0000-4000-8000-000000000001', 'closed', 'vi phạm') $$,
  'staff ẩn tin');
select tests.clear_auth();
select is((select count(*)::int from public.get_listing_by_slug((select slug1 from r2))), 0,
  'H2: tin staff ẩn không còn công khai (kể cả trang "đã gỡ")');
select tests.authenticate_as('r2_owner');
select throws_ok($$ update public.listings set moderation_hold = false where id = 'e0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'H2: chủ tin không tự gỡ khoá');
select lives_ok($$ update public.listings set status = 'active' where id = 'e0000000-0000-4000-8000-000000000001' $$,
  'chủ tin bấm mở lại');
select is((select status::text from public.listings where id = 'e0000000-0000-4000-8000-000000000001'), 'pending_review',
  'H2: tin staff ẩn mở lại → pending_review');
select ok((select 'resubmit' = any (moderation_reasons) from public.listings where id = 'e0000000-0000-4000-8000-000000000001'),
  'H2: lý do resubmit');

-- ── H2b: staff từ chối → nháp → active → vào hàng chờ ─────────────────────────────
select tests.authenticate_as('r2_mod');
select lives_ok($$ select public.staff_set_listing_status('e0000000-0000-4000-8000-000000000002', 'rejected', 'lừa đảo') $$,
  'staff từ chối tin');
select tests.authenticate_as('r2_owner');
update public.listings set status = 'draft' where id = 'e0000000-0000-4000-8000-000000000002';
update public.listings set status = 'active' where id = 'e0000000-0000-4000-8000-000000000002';
select is((select status::text from public.listings where id = 'e0000000-0000-4000-8000-000000000002'), 'pending_review',
  'H2: rejected → draft → active vẫn vào hàng chờ');
select throws_ok($$ update public.listings set status = 'sold' where id = 'e0000000-0000-4000-8000-000000000002' $$,
  '42501', null, 'H1: tin chờ duyệt → sold bị chặn');

-- ── H2c: 3 báo cáo → ẩn tạm; chủ tin closed → active vẫn vào hàng chờ; trong lúc đó không công khai ──
select tests.authenticate_as('r2_rep1');
insert into public.reports (reporter_id, target_type, target_id, reason)
values (tests.get_uid('r2_rep1'), 'listing', 'e0000000-0000-4000-8000-000000000003', 'scam');
select tests.authenticate_as('r2_rep2');
insert into public.reports (reporter_id, target_type, target_id, reason)
values (tests.get_uid('r2_rep2'), 'listing', 'e0000000-0000-4000-8000-000000000003', 'scam');
select tests.authenticate_as('r2_rep3');
insert into public.reports (reporter_id, target_type, target_id, reason)
values (tests.get_uid('r2_rep3'), 'listing', 'e0000000-0000-4000-8000-000000000003', 'scam');
select tests.authenticate_as('r2_owner');
select lives_ok($$ update public.listings set status = 'closed' where id = 'e0000000-0000-4000-8000-000000000003' $$,
  'chủ tin rút tin bị ẩn tạm');
select tests.clear_auth();
select is((select count(*)::int from public.get_listing_by_slug((select slug3 from r2))), 0,
  'H2: tin bị báo cáo rồi đóng không công khai');
select tests.authenticate_as('r2_owner');
update public.listings set status = 'active' where id = 'e0000000-0000-4000-8000-000000000003';
select is((select status::text from public.listings where id = 'e0000000-0000-4000-8000-000000000003'), 'pending_review',
  'H2: tin bị báo cáo → closed → active vẫn vào hàng chờ');

-- Đối chứng: moderator duyệt → active, gỡ khoá, công khai lại.
select tests.authenticate_as('r2_mod');
select lives_ok($$ select public.review_listing('e0000000-0000-4000-8000-000000000003', true, null) $$, 'moderator duyệt');
select tests.clear_auth();
select is((select count(*)::int from public.get_listing_by_slug((select slug3 from r2))), 1, 'đối chứng: tin đã duyệt công khai lại');

-- ── M1: staff huỷ nhóm → ẩn khỏi công khai ─────────────────────────────────────────
reset role;
create temp table r2g as select id, slug from public.groups where status = 'open' and deleted_at is null limit 1;
grant select on r2g to anon, authenticated;
select tests.authenticate_as('r2_mod');
select lives_ok($$ select public.staff_cancel_group((select id from r2g), 'vi phạm') $$, 'staff huỷ nhóm');
select tests.clear_auth();
select is((select count(*)::int from public.get_group_by_slug((select slug from r2g))), 0, 'M1: nhóm bị staff huỷ không còn công khai');

-- ── M2: khoảng cách khớp đồ thất lạc làm tròn 500 m ───────────────────────────────
reset role;
insert into public.lost_found_matches (lost_id, found_id, distance_m)
select (select id from public.listings where category = 'lost' order by id limit 1),
       (select id from public.listings where category = 'found' order by id limit 1), 483
on conflict do nothing;
select is((select distance_m from public.lost_found_matches
           where lost_id = (select id from public.listings where category = 'lost' order by id limit 1)
             and found_id = (select id from public.listings where category = 'found' order by id limit 1)), 500,
  'M2: 483 m → 500 m');

-- ── M3: staff bị cấm mất quyền staff ───────────────────────────────────────────────
select tests.authenticate_as('r2_badmod');
select is(public.is_staff(), false, 'M3: moderator bị cấm không còn is_staff()');

-- ── M4 + L1: hồ sơ ─────────────────────────────────────────────────────────────────
select tests.authenticate_as('r2_mod');
select throws_ok($$ update public.profiles set deleted_at = now() where id = tests.get_uid('r2_boss') $$,
  '42501', null, 'M4: moderator không khoá admin bằng deleted_at');
select throws_ok($$ update public.profiles set full_name = 'Đổi tên' where id = tests.get_uid('r2_rep1') $$,
  '42501', null, 'M4: moderator không sửa họ tên người khác');
select throws_ok($$ update public.profiles set banned_until = now() + interval '1 day' where id = tests.get_uid('r2_mod2') $$,
  '42501', null, 'M4: moderator không khoá moderator khác');
select lives_ok($$ update public.profiles set banned_until = now() + interval '1 day' where id = tests.get_uid('r2_rep1') $$,
  'đối chứng: moderator khoá tạm người dùng');
reset role;
update public.profiles set deleted_at = now() where id = tests.get_uid('r2_rep2');   -- như delete_my_account()
select tests.authenticate_as('r2_rep2');
select throws_ok($$ update public.profiles set deleted_at = null where id = tests.get_uid('r2_rep2') $$,
  '42501', null, 'L1: người dùng không tự đổi deleted_at');

-- ── L3: venues theo cột cho anon ───────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select created_by from public.venues limit 1 $$, '42501', null, 'L3: anon không đọc created_by của sân');

select * from finish();
rollback;
