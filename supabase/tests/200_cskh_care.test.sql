-- CSKH cho admin (migration 20261129100000_cskh_care): hàng chờ đơn Gọi thợ hoàn thành, ghi kết quả, lấy SĐT để gọi, audit
-- không chép SĐT / ghi chú, loại tin Zalo mới. 5 vai trò: anon, user, bị cấm, moderator, admin.
begin;
\ir _helpers.psql
select plan(33);

select tests.create_user('cs_cust');
select tests.create_user('cs_pro');
select tests.create_user('cs_banned');
select tests.ban_user('cs_banned');
select tests.create_user('cs_mod', 'moderator');
select tests.create_user('cs_admin', 'admin');

-- Dữ liệu bằng postgres: R1 đã hoàn thành (khách cs_cust, thợ cs_pro, khách đã chấm thợ trong app), R2 còn mở.
reset role;
insert into public.service_requests (id, customer_id, trade, title)
values ('00000000-0000-4000-8000-0000000c0001', tests.get_uid('cs_cust'), 'hvac', 'Sửa máy lạnh phòng trọ'),
       ('00000000-0000-4000-8000-0000000c0002', tests.get_uid('cs_cust'), 'cleaning', 'Dọn phòng trọ cuối tháng');
insert into public.service_quotes (id, request_id, pro_id, price, status)
values ('00000000-0000-4000-8000-0000000c0003', '00000000-0000-4000-8000-0000000c0001', tests.get_uid('cs_pro'), 300000, 'accepted');
update public.service_requests
   set status = 'completed', accepted_quote_id = '00000000-0000-4000-8000-0000000c0003', completed_at = now()
 where id = '00000000-0000-4000-8000-0000000c0001';
insert into public.ratings (rater_id, ratee_id, context_type, context_id, score)
values (tests.get_uid('cs_cust'), tests.get_uid('cs_pro'), 'service_request', '00000000-0000-4000-8000-0000000c0001', 5);

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select count(*) from public.cskh_queue $$, '42501', null, 'anon: không đọc cskh_queue');
select throws_ok($$ select count(*) from public.cskh_cases $$, '42501', null, 'anon: không đọc cskh_cases');
select throws_ok($$ select public.save_cskh_case('00000000-0000-4000-8000-0000000c0001', 'customer', 'done') $$,
  '42501', null, 'anon: không gọi save_cskh_case');
select throws_ok($$ select public.reveal_cskh_phone('00000000-0000-4000-8000-0000000c0001', 'customer') $$,
  '42501', null, 'anon: không gọi reveal_cskh_phone');

-- ── user thường (chính là khách của đơn) + bị cấm ───────────────────────────────
select tests.authenticate_as('cs_cust');
select is((select count(*)::int from public.cskh_queue), 0, 'user: dù là khách của đơn vẫn không thấy hàng chờ CSKH');
select is((select count(*)::int from public.cskh_cases), 0, 'user: không đọc cskh_cases');
select throws_ok($$ select public.save_cskh_case('00000000-0000-4000-8000-0000000c0001', 'customer', 'done') $$,
  '42501', 'forbidden', 'user: save_cskh_case → forbidden');
select throws_ok($$ select public.reveal_cskh_phone('00000000-0000-4000-8000-0000000c0001', 'pro') $$,
  '42501', 'forbidden', 'user: reveal_cskh_phone → forbidden');
select tests.authenticate_as('cs_banned');
select throws_ok($$ select public.save_cskh_case('00000000-0000-4000-8000-0000000c0001', 'customer', 'done') $$,
  '42501', 'forbidden', 'bị cấm: save_cskh_case → forbidden');

-- ── moderator: hàng chờ ─────────────────────────────────────────────────────────
select tests.authenticate_as('cs_mod');
select is((select count(*)::int from public.cskh_queue where request_id = '00000000-0000-4000-8000-0000000c0001'), 2,
  'moderator: đơn hoàn thành có 2 dòng (khách + thợ)');
select is((select count(*)::int from public.cskh_queue where request_id = '00000000-0000-4000-8000-0000000c0002'), 0,
  'đơn chưa hoàn thành không vào hàng chờ');
select is((select count(*)::int from public.cskh_queue where request_id = '00000000-0000-4000-8000-0000000c0001' and status = 'pending'), 2,
  'chưa ghi kết quả = pending');
select is((select bool_and(has_phone) from public.cskh_queue where request_id = '00000000-0000-4000-8000-0000000c0001'), true,
  'has_phone: cả hai có SĐT (không lộ SĐT)');
select is((select rated_in_app from public.cskh_queue where request_id = '00000000-0000-4000-8000-0000000c0001' and party = 'customer'), true,
  'khách đã chấm thợ trong app → rated_in_app');
select is((select rated_in_app from public.cskh_queue where request_id = '00000000-0000-4000-8000-0000000c0001' and party = 'pro'), false,
  'thợ chưa chấm khách');

-- ── moderator: ghi kết quả ──────────────────────────────────────────────────────
select lives_ok($$ select public.save_cskh_case('00000000-0000-4000-8000-0000000c0001', 'customer', 'contacted', 'call', '  Khách hài lòng  ', 4) $$,
  'moderator: ghi kết quả cho khách');
select is((select status || '/' || channel || '/' || score from public.cskh_queue where request_id = '00000000-0000-4000-8000-0000000c0001' and party = 'customer'),
  'contacted/call/4', 'kết quả hiện trong hàng chờ (trạng thái / kênh / điểm)');
select is((select note from public.cskh_queue where request_id = '00000000-0000-4000-8000-0000000c0001' and party = 'customer'), 'Khách hài lòng',
  'ghi chú được cắt khoảng trắng');
select isnt((select handled_by_name from public.cskh_queue where request_id = '00000000-0000-4000-8000-0000000c0001' and party = 'customer'), null,
  'có người xử lý');
select lives_ok($$ select public.save_cskh_case('00000000-0000-4000-8000-0000000c0001', 'customer', 'done', 'zalo', null, 5) $$,
  'ghi lại lần hai (cập nhật)');
select is((select count(*)::int from public.cskh_cases where request_id = '00000000-0000-4000-8000-0000000c0001' and party = 'customer'), 1,
  'cập nhật không tạo thêm dòng');
select is((select status from public.cskh_queue where request_id = '00000000-0000-4000-8000-0000000c0001' and party = 'pro'), 'pending',
  'bên thợ vẫn pending');

-- ── lỗi nghiệp vụ ───────────────────────────────────────────────────────────────
select throws_ok($$ select public.save_cskh_case('00000000-0000-4000-8000-0000000c0001', 'customer', 'done', null, null, 6) $$,
  'P0001', 'invalid_input', 'điểm ngoài 1–5 → invalid_input');
select throws_ok($$ select public.save_cskh_case('00000000-0000-4000-8000-0000000c0001', 'pro', 'no_answer', 'call', null, 3) $$,
  'P0001', 'invalid_input', 'điểm khi không nghe máy → invalid_input');
select throws_ok($$ select public.save_cskh_case('00000000-0000-4000-8000-0000000c0001', 'khach', 'done') $$,
  'P0001', 'invalid_input', 'bên lạ → invalid_input');
select throws_ok($$ select public.save_cskh_case('00000000-0000-4000-8000-0000000c0002', 'customer', 'done') $$,
  'P0001', 'not_found', 'đơn chưa hoàn thành → not_found');

-- ── lấy SĐT để gọi + audit ─────────────────────────────────────────────────────
select is(public.reveal_cskh_phone('00000000-0000-4000-8000-0000000c0001', 'customer'),
  (select '0' || substr(phone, 3) from public.profiles where id = tests.get_uid('cs_cust')), 'reveal: SĐT dạng 0xxxxxxxxx của khách');
reset role;
update public.profiles set phone = null where id = tests.get_uid('cs_pro');
select tests.authenticate_as('cs_mod');
select throws_ok($$ select public.reveal_cskh_phone('00000000-0000-4000-8000-0000000c0001', 'pro') $$,
  'P0001', 'no_phone', 'thợ không có SĐT → no_phone');

reset role;
select is((select count(*)::int from public.audit_log where action = 'cskh.reveal' and actor_id = tests.get_uid('cs_mod')), 1,
  'audit ghi cskh.reveal (lần lỗi không ghi)');
select is((select count(*)::int from public.audit_log where action = 'cskh.update' and actor_id = tests.get_uid('cs_mod')), 2,
  'audit ghi cskh.update cho mỗi lần lưu');
select is((select count(*)::int from public.audit_log where action in ('cskh.update', 'cskh.reveal')
            and (meta::text like '%hài lòng%' or meta::text like '%8491%' or meta::text like '%0910%')), 0,
  'audit không chép ghi chú / SĐT');

-- ── Zalo: loại tin CSKH mới + admin cũng đọc được hàng chờ ──────────────────────
select tests.authenticate_as('cs_mod');
select is((public.reserve_zalo_message('user', tests.get_uid('cs_cust'), 'rating_request', 'Mời anh/chị đánh giá giúp') ->> 'ok')::boolean, true,
  'moderator: nhắn Zalo loại rating_request cho khách');
select tests.authenticate_as('cs_admin');
select is((select count(*)::int from public.cskh_queue where request_id = '00000000-0000-4000-8000-0000000c0001'), 2,
  'admin: cũng đọc được hàng chờ');

select * from finish();
rollback;
