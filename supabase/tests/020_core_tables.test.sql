-- sites, notifications, bookmarks, blocks, ratings, badge_requests, audit_log, rate_limits.
begin;
\ir _helpers.psql
select plan(36);

select tests.create_user('user_a');
select tests.create_user('user_b');
select tests.create_user('bad');
select tests.ban_user('bad');
select tests.create_user('mod', 'moderator');
select tests.create_user('boss', 'admin');

insert into public.notifications (user_id, type, title_key, data)
values (tests.get_uid('user_a'), 'system', 'notification.welcome', '{"screen":"notifications"}'),
       (tests.get_uid('user_b'), 'system', 'notification.welcome', '{"screen":"notifications"}');
insert into public.badge_requests (id, user_id, badge, document_path)
values ('11111111-1111-4111-8111-111111111111', tests.get_uid('user_a'), 'landlord', 'x/landlord/1.webp');

-- ── sites ───────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select ok((select count(*) from public.sites) >= 3, 'anon: đọc sites');
select is((select array_agg(code order by code) from public.sites),
  array['cang_dung_quat','hoa_phat_dung_quat','hyundai_eco_vina','vsip_quang_ngai'], 'sites: 4 địa điểm khu Dung Quất');
select tests.authenticate_as('user_a');
select throws_ok($$ insert into public.sites (code, name, location) values ('x', 'X', 'POINT(0 0)') $$, '42501', null,
  'user: không thêm site');
select tests.authenticate_as('boss');
select lives_ok($$ insert into public.sites (code, name, location) values ('test_site', 'Test', 'POINT(106 21)') $$,
  'admin: thêm site');
select lives_ok($$ update public.sites set is_active = false where code = 'test_site' $$, 'admin: ẩn site');
select is((select count(*)::int from public.sites where code = 'test_site'), 1, 'admin: vẫn thấy site đã ẩn');
select tests.clear_auth();
select is((select count(*)::int from public.sites where code = 'test_site'), 0, 'anon: không thấy site đã ẩn');
select tests.authenticate_as('user_a');
select is((select count(*)::int from public.sites where code = 'test_site'), 0, 'user: không thấy site đã ẩn');
reset role;
select is((select array_agg(action order by id) from public.audit_log where target_type = 'site' and target_id = 'test_site'),
  array['site.create','site.update'], 'trigger: ghi audit khi admin thêm / sửa site');

-- ── notifications ───────────────────────────────────────────────────────────────
select tests.authenticate_as('user_a');
select is((select count(*)::int from public.notifications), 1, 'user: chỉ thấy thông báo của mình');
select lives_ok($$ update public.notifications set read_at = now() where user_id = tests.get_uid('user_a') $$,
  'user: đánh dấu đã đọc');
select throws_ok($$ update public.notifications set type = 'new_message' $$, '42501', null,
  'user: không sửa cột khác read_at');
select throws_ok($$ insert into public.notifications (user_id, type, title_key) values (tests.get_uid('user_a'), 'system', 'x') $$,
  '42501', null, 'user: không tự tạo thông báo');
select tests.clear_auth();
select throws_ok($$ select * from public.notifications $$, '42501', null, 'anon: không đọc thông báo');

-- ── bookmarks ───────────────────────────────────────────────────────────────────
select tests.authenticate_as('user_a');
select lives_ok($$ insert into public.bookmarks (user_id, target_type, target_id) values (tests.get_uid('user_a'), 'listing', gen_random_uuid()) $$,
  'user: lưu tin');
select throws_ok($$ insert into public.bookmarks (user_id, target_type, target_id) values (tests.get_uid('user_b'), 'listing', gen_random_uuid()) $$,
  '42501', null, 'user: không lưu thay người khác');
select tests.authenticate_as('user_b');
select is((select count(*)::int from public.bookmarks), 0, 'user_b: không thấy tin đã lưu của user_a');
select tests.authenticate_as('bad');
select throws_ok($$ insert into public.bookmarks (user_id, target_type, target_id) values (tests.get_uid('bad'), 'listing', gen_random_uuid()) $$,
  '42501', null, 'banned: không lưu tin');

-- ── blocks ──────────────────────────────────────────────────────────────────────
select tests.authenticate_as('user_a');
select lives_ok($$ insert into public.blocks (blocker_id, blocked_id) values (tests.get_uid('user_a'), tests.get_uid('user_b')) $$,
  'user: chặn người khác');
select throws_ok($$ insert into public.blocks (blocker_id, blocked_id) values (tests.get_uid('user_a'), tests.get_uid('user_a')) $$,
  '23514', null, 'user: không tự chặn mình');
select ok(public.is_blocked(tests.get_uid('user_b'), tests.get_uid('user_a')), 'is_blocked tính cả hai chiều');
select tests.authenticate_as('user_b');
select is((select count(*)::int from public.blocks), 0, 'người bị chặn không thấy danh sách chặn của người khác');

-- ── ratings ─────────────────────────────────────────────────────────────────────
select tests.authenticate_as('user_a');
select throws_ok($$ insert into public.ratings (rater_id, ratee_id, context_type, context_id, score) values (tests.get_uid('user_a'), tests.get_uid('user_b'), 'listing', gen_random_uuid(), 5) $$,
  '42501', null, 'user: chưa được tự chèn đánh giá (chờ RPC theo giao dịch)');
reset role;
insert into public.ratings (rater_id, ratee_id, context_type, context_id, score)
values (tests.get_uid('user_a'), tests.get_uid('user_b'), 'listing', gen_random_uuid(), 5),
       (tests.get_uid('mod'),    tests.get_uid('user_b'), 'group',   gen_random_uuid(), 4);
select is((select rating_avg from public.profiles where id = tests.get_uid('user_b')), 4.50::numeric(3,2), 'trigger: rating_avg');
select is((select rating_count from public.profiles where id = tests.get_uid('user_b')), 2, 'trigger: rating_count');

-- ── badge_requests ──────────────────────────────────────────────────────────────
select tests.authenticate_as('user_a');
select is((select count(*)::int from public.badge_requests), 1, 'user: thấy yêu cầu của mình');
update public.badge_requests set status = 'approved';
reset role;
select is((select status from public.badge_requests where id = '11111111-1111-4111-8111-111111111111'), 'pending',
  'user: tự duyệt không có tác dụng');
select tests.authenticate_as('mod');
select lives_ok($$ update public.badge_requests set status = 'approved' where id = '11111111-1111-4111-8111-111111111111' $$,
  'moderator: duyệt huy hiệu');
reset role;
select ok((select 'landlord' = any(badges) from public.profiles where id = tests.get_uid('user_a')), 'duyệt → huy hiệu vào profile');
select is((select reviewed_by from public.badge_requests where id = '11111111-1111-4111-8111-111111111111'), tests.get_uid('mod'),
  'reviewed_by = moderator');

-- ── audit_log ───────────────────────────────────────────────────────────────────
select tests.authenticate_as('mod');
select lives_ok($$ insert into public.audit_log (actor_id, action, target_type, target_id) values (tests.get_uid('mod'), 'badge.approve', 'badge_request', '1') $$,
  'moderator: ghi audit');
select throws_ok($$ insert into public.audit_log (actor_id, action) values (tests.get_uid('boss'), 'user.ban') $$, '42501', null,
  'moderator: không ghi audit mạo danh người khác');
select is((select count(*)::int from public.audit_log), 0, 'moderator: không đọc audit (chỉ admin)');
select tests.authenticate_as('user_a');
select throws_ok($$ insert into public.audit_log (actor_id, action) values (tests.get_uid('user_a'), 'user.ban') $$, '42501', null,
  'user: không ghi audit');
reset role;
select throws_ok($$ update public.audit_log set action = 'x.y' $$, '42501', null, 'audit_log: không sửa được, kể cả postgres');

-- ── rate limit ──────────────────────────────────────────────────────────────────
select public.assert_rate_limit('test-key', 'test.action', 2, 3600);
select public.assert_rate_limit('test-key', 'test.action', 2, 3600);
select throws_ok($$ select public.assert_rate_limit('test-key', 'test.action', 2, 3600) $$, 'P0001', 'rate_limited',
  'assert_rate_limit: lần thứ 3 bị chặn');

select * from finish();
rollback;
