-- Gọi thợ (20261128090000_service_requests + 20261128100000_service_request_chat).
-- Vai trò: anon, chủ yêu cầu (cust), thợ được chọn (pro1), thợ bị từ chối (pro2), người ngoài (outsider), bị cấm (bad),
-- moderator (mod). Luồng: đăng yêu cầu → báo giá → chọn → chat → hoàn thành → đánh giá; huỷ; hết hạn; staff huỷ.
begin;
\ir _helpers.psql
select plan(95);

select tests.create_user('cust');
select tests.create_user('pro1');
select tests.create_user('pro2');
select tests.create_user('outsider');
select tests.create_user('bad');
select tests.ban_user('bad');
select tests.create_user('mod', 'moderator');

create temp table t_r (name text primary key, id uuid);
create temp table t_q (name text primary key, id uuid);
create temp table t_c (name text primary key, id uuid);
grant all on t_r, t_q, t_c to authenticated, anon;

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select count(*) from public.service_requests $$, '42501', null, 'anon: không đọc bảng gốc service_requests');
select throws_ok($$ select count(*) from public.service_quotes $$, '42501', null, 'anon: không đọc service_quotes');
select throws_ok($$ insert into public.service_requests (trade, title) values ('hvac', 'Sửa điều hòa kêu to') $$,
  '42501', null, 'anon: không tạo yêu cầu');
select throws_ok($$ select public.submit_quote_tx('00000000-0000-4000-8000-000000000999', 100000) $$,
  '42501', null, 'anon: không gọi submit_quote_tx');
select ok((select count(*)::int from public.search_service_requests(p_limit => 1000)) <= 50, 'anon: gọi được search_service_requests, p_limit kẹp 50');

-- ── cust đăng yêu cầu ───────────────────────────────────────────────────────────
select tests.authenticate_as('cust');
select throws_ok($$ insert into public.service_requests (trade, title, status) values ('hvac', 'Tự đặt trạng thái', 'assigned') $$,
  '42501', null, 'cust: không tự đặt trạng thái');
select throws_ok($$ insert into public.service_requests (trade, title, quotes_count) values ('hvac', 'Tự đặt số báo giá', 3) $$,
  '42501', null, 'cust: không tự đặt quotes_count');
select throws_ok(format($$ insert into public.service_requests (customer_id, trade, title) values ('%s', 'hvac', 'Đăng hộ người khác') $$, tests.get_uid('pro1')),
  '42501', null, 'cust: không đăng thay người khác');
select throws_ok($$ insert into public.service_requests (trade, title) values ('hvac', 'Sửa điều hòa 0912345678') $$,
  'P0001', 'message_has_phone', 'cust: tiêu đề có số điện thoại bị chặn');
select throws_ok(format($$ insert into public.service_requests (trade, title, images) values ('hvac', 'Ảnh của người khác', array['%s/a/1.webp']) $$, tests.get_uid('pro1')),
  'P0001', 'invalid_input', 'cust: ảnh phải nằm trong thư mục của mình');
select throws_ok(format($$ insert into public.service_requests (trade, title, images) values ('hvac', 'Quá nhiều ảnh', array['%1$s/a/1.webp','%1$s/a/2.webp','%1$s/a/3.webp','%1$s/a/4.webp','%1$s/a/5.webp']) $$, tests.get_uid('cust')),
  '23514', null, 'cust: tối đa 4 ảnh');
select throws_ok($$ insert into public.service_requests (trade, title, budget_min, budget_max) values ('hvac', 'Ngân sách ngược', 500000, 100000) $$,
  '23514', null, 'cust: ngân sách tối đa không nhỏ hơn tối thiểu');

with x as (
  insert into public.service_requests (trade, title, description, site, location, address_text, budget_min, budget_max, urgency)
  values ('electric_plumbing', '  Sửa ổ điện phòng trọ  ', 'Ổ cắm hay bị chập', 'hoa_phat_dung_quat',
          extensions.st_setsrid(extensions.st_makepoint(108.82234, 15.38567), 4326)::extensions.geography,
          '12 Nguyễn Văn Linh, Dung Quất', 100000, 300000, 'today')
  returning id)
insert into t_r select 'main', id from x;
select isnt((select id from t_r where name = 'main'), null, 'cust: tạo yêu cầu');
select is((select title from public.service_requests where id = (select id from t_r where name = 'main')), 'Sửa ổ điện phòng trọ',
  'cust: tiêu đề được cắt khoảng trắng');
select is((select status::text from public.service_requests where id = (select id from t_r where name = 'main')), 'open',
  'cust: yêu cầu mới là open');
select is((select (expires_at > now() + interval '6 days')::text from public.service_requests where id = (select id from t_r where name = 'main')), 'true',
  'cust: hết hạn sau 7 ngày');
select lives_ok(format($$ update public.service_requests set title = 'Sửa ổ điện phòng bếp' where id = '%s' $$, (select id from t_r where name = 'main')),
  'cust: sửa nội dung khi chưa có báo giá');
select throws_ok(format($$ update public.service_requests set status = 'completed' where id = '%s' $$, (select id from t_r where name = 'main')),
  '42501', null, 'cust: không tự đổi trạng thái');
select throws_ok(format($$ update public.service_requests set trade = 'hvac' where id = '%s' $$, (select id from t_r where name = 'main')),
  '42501', null, 'cust: không đổi loại thợ');

with x as (
  insert into public.service_requests (trade, title) values ('cleaning', 'Dọn phòng trọ cuối tháng') returning id)
insert into t_r select 'cancel', id from x;
with x as (
  insert into public.service_requests (trade, title) values ('welding', 'Hàn lại khung cửa sắt') returning id)
insert into t_r select 'staff', id from x;

-- ── anon đọc qua view ───────────────────────────────────────────────────────────
select tests.clear_auth();
select is((select count(*)::int from public.public_service_requests where id = (select id from t_r where name = 'main')), 1,
  'anon: đọc yêu cầu qua view công khai');
select is((select count(*)::int from public.search_service_requests(p_trade => 'electric_plumbing') s where s.id = (select id from t_r where name = 'main')), 1,
  'anon: tìm thấy yêu cầu theo loại thợ');
select isnt((select lat from public.public_service_requests where id = (select id from t_r where name = 'main')), 15.38567::double precision,
  'anon: toạ độ trên view đã làm tròn lưới');

-- ── pro1 / pro2 báo giá ─────────────────────────────────────────────────────────
select tests.authenticate_as('pro1');
select is((select count(*)::int from public.service_requests where id = (select id from t_r where name = 'main')), 0,
  'pro1: chưa được chọn → không đọc bảng gốc');
select is((select count(*)::int from public.get_service_request_private((select id from t_r where name = 'main'))), 0,
  'pro1: chưa được chọn → không thấy địa chỉ chính xác');
select throws_ok(format($$ select public.submit_quote_tx('%s', 500) $$, (select id from t_r where name = 'main')),
  'P0001', 'invalid_input', 'pro1: giá quá thấp');
select throws_ok(format($$ select public.submit_quote_tx('%s', 500000, null, 'Gọi em 0912345678 nhé') $$, (select id from t_r where name = 'main')),
  'P0001', 'message_has_phone', 'pro1: ghi chú có số điện thoại bị chặn');
insert into t_q select 'p1', public.submit_quote_tx((select id from t_r where name = 'main'), 500000, now() + interval '1 day', 'Em làm trong 1 giờ');
select isnt((select id from t_q where name = 'p1'), null, 'pro1: gửi báo giá');
select lives_ok(format($$ select public.submit_quote_tx('%s', 450000, now() + interval '1 day', 'Em làm trong 1 giờ') $$, (select id from t_r where name = 'main')),
  'pro1: sửa giá báo giá đang gửi');
select is((select price::int from public.service_quotes where id = (select id from t_q where name = 'p1')), 450000, 'pro1: giá đã được sửa');
select throws_ok(format($$ insert into public.service_quotes (request_id, price) values ('%s', 100000) $$, (select id from t_r where name = 'main')),
  '42501', null, 'pro1: không insert thẳng service_quotes');
select throws_ok(format($$ update public.service_quotes set price = 1000 where id = '%s' $$, (select id from t_q where name = 'p1')),
  '42501', null, 'pro1: không update thẳng service_quotes');
insert into t_c select 'pre', public.start_request_conversation((select id from t_r where name = 'main'));
select isnt((select id from t_c where name = 'pre'), null, 'pro1: mở chat với chủ khi đã có báo giá');

select tests.authenticate_as('pro2');
insert into t_q select 'p2', public.submit_quote_tx((select id from t_r where name = 'main'), 600000);
select isnt((select id from t_q where name = 'p2'), null, 'pro2: gửi báo giá');
select lives_ok(format($$ select public.withdraw_quote('%s') $$, (select id from t_q where name = 'p2')), 'pro2: rút báo giá');
select throws_ok(format($$ select public.withdraw_quote('%s') $$, (select id from t_q where name = 'p2')),
  'P0001', 'quote_not_pending', 'pro2: rút lại báo giá đã rút');
select lives_ok(format($$ select public.submit_quote_tx('%s', 580000) $$, (select id from t_r where name = 'main')), 'pro2: gửi lại báo giá sau khi rút');
select is((select count(*)::int from public.service_quotes), 1, 'pro2: chỉ thấy báo giá của mình');

-- ── outsider ────────────────────────────────────────────────────────────────────
select tests.authenticate_as('outsider');
select is((select count(*)::int from public.list_request_quotes((select id from t_r where name = 'main'))), 0,
  'outsider: không thấy báo giá của yêu cầu');
select throws_ok(format($$ select public.start_request_conversation('%s') $$, (select id from t_r where name = 'main')),
  'P0001', 'forbidden', 'outsider: không có báo giá thì không mở chat');
select throws_ok(format($$ select public.accept_quote_tx('%s') $$, (select id from t_q where name = 'p1')),
  'P0001', 'forbidden', 'outsider: không chọn báo giá của yêu cầu người khác');
select throws_ok(format($$ select public.cancel_request('%s') $$, (select id from t_r where name = 'main')),
  'P0001', 'not_found', 'outsider: không huỷ yêu cầu người khác');

-- ── cust xem báo giá, chọn thợ ──────────────────────────────────────────────────
select tests.authenticate_as('cust');
select is((select count(*)::int from public.list_request_quotes((select id from t_r where name = 'main'))), 2, 'cust: thấy 2 báo giá');
select is((select quotes_count from public.public_service_requests where id = (select id from t_r where name = 'main')), 2,
  'cust: quotes_count đếm báo giá chưa rút');
select throws_ok(format($$ update public.service_requests set title = 'Đổi tiêu đề sau khi có báo giá' where id = '%s' $$, (select id from t_r where name = 'main')),
  'P0001', 'request_has_quotes', 'cust: không sửa nội dung khi đã có báo giá');
select throws_ok(format($$ select public.submit_quote_tx('%s', 300000) $$, (select id from t_r where name = 'main')),
  'P0001', 'cannot_quote_own', 'cust: không báo giá cho yêu cầu của mình');
select throws_ok(format($$ select public.start_request_conversation('%s') $$, (select id from t_r where name = 'main')),
  'P0001', 'invalid_input', 'cust: mở chat phải chỉ rõ thợ');
select throws_ok(format($$ select public.start_request_conversation('%s', '%s') $$, (select id from t_r where name = 'main'), tests.get_uid('outsider')),
  'P0001', 'not_found', 'cust: chỉ mở chat với thợ đã báo giá');
insert into t_c select 'main', public.accept_quote_tx((select id from t_q where name = 'p1'));
select isnt((select id from t_c where name = 'main'), null, 'cust: chọn báo giá → mở chat');
select is((select id from t_c where name = 'main'), (select id from t_c where name = 'pre'), 'cust: chat là hội thoại pro1 đã mở trước');
select is((select status::text from public.service_requests where id = (select id from t_r where name = 'main')), 'assigned',
  'cust: yêu cầu chuyển assigned');
select is((select status::text from public.service_quotes where id = (select id from t_q where name = 'p2')), 'declined',
  'cust: báo giá còn lại bị từ chối');
select throws_ok(format($$ select public.accept_quote_tx('%s') $$, (select id from t_q where name = 'p2')),
  'P0001', 'request_closed', 'cust: không chọn thêm báo giá thứ hai');
select is((select request_title from public.list_conversations(20, null, (select id from t_c where name = 'main'))), 'Sửa ổ điện phòng bếp',
  'cust: hộp thư hiện tên yêu cầu');
select is((select address_text from public.get_service_request_private((select id from t_r where name = 'main'))), '12 Nguyễn Văn Linh, Dung Quất',
  'cust: thấy địa chỉ chính xác của mình');

-- ── sau khi chọn: pro1 / pro2 ───────────────────────────────────────────────────
select tests.authenticate_as('pro2');
select throws_ok(format($$ select public.submit_quote_tx('%s', 100000) $$, (select id from t_r where name = 'main')),
  'P0001', 'request_closed', 'pro2: yêu cầu đã giao → không báo giá nữa');
select is((select count(*)::int from public.get_service_request_private((select id from t_r where name = 'main'))), 0,
  'pro2: bị từ chối → không thấy địa chỉ');
select throws_ok(format($$ select public.rate_service_request('%s', 5) $$, (select id from t_r where name = 'main')),
  'P0001', 'forbidden', 'pro2: không phải thợ được chọn → không chấm');

select tests.authenticate_as('pro1');
select is((select address_text from public.get_service_request_private((select id from t_r where name = 'main'))), '12 Nguyễn Văn Linh, Dung Quất',
  'pro1: thợ được chọn thấy địa chỉ chính xác');
select is((select count(*)::int from public.service_requests where id = (select id from t_r where name = 'main')), 1,
  'pro1: thợ được chọn đọc được bảng gốc');
select throws_ok(format($$ select public.withdraw_quote('%s') $$, (select id from t_q where name = 'p1')),
  'P0001', 'quote_not_pending', 'pro1: báo giá đã được chọn không rút được');
select throws_ok(format($$ select public.rate_service_request('%s', 5) $$, (select id from t_r where name = 'main')),
  'P0001', 'request_not_completed', 'pro1: chưa hoàn thành → chưa chấm');
select throws_ok(format($$ select public.complete_request_tx('%s') $$, (select id from t_r where name = 'main')),
  'P0001', 'not_found', 'pro1: chỉ chủ mới xác nhận hoàn thành');
select lives_ok(format($$ insert into public.messages (conversation_id, body) values ('%s', 'Em đến lúc 9 giờ nhé') $$, (select id from t_c where name = 'main')),
  'pro1: nhắn tin trong chat yêu cầu');

-- ── hoàn thành + đánh giá hai chiều ─────────────────────────────────────────────
select tests.authenticate_as('cust');
select lives_ok(format($$ select public.complete_request_tx('%s') $$, (select id from t_r where name = 'main')), 'cust: xác nhận hoàn thành');
select is((select status::text from public.service_requests where id = (select id from t_r where name = 'main')), 'completed',
  'cust: yêu cầu completed');
select throws_ok(format($$ select public.rate_service_request('%s', 6) $$, (select id from t_r where name = 'main')),
  'P0001', 'invalid_input', 'cust: điểm phải 1–5');
select lives_ok(format($$ select public.rate_service_request('%s', 5, 'Làm nhanh, gọn') $$, (select id from t_r where name = 'main')),
  'cust: chấm thợ');
select throws_ok(format($$ select public.rate_service_request('%s', 4) $$, (select id from t_r where name = 'main')),
  'P0001', 'already_rated', 'cust: chỉ chấm một lần');
select tests.authenticate_as('pro1');
select lives_ok(format($$ select public.rate_service_request('%s', 4) $$, (select id from t_r where name = 'main')), 'pro1: chấm lại chủ yêu cầu');

reset role;
select is((select count(*)::int from public.ratings where context_type = 'service_request' and context_id = (select id from t_r where name = 'main')), 2,
  'ratings: hai chiều đã ghi (chỉ đếm đơn của test, không tính dữ liệu mẫu)');
select is((select rating_avg from public.profiles where id = tests.get_uid('pro1')), 5.00::numeric, 'ratings: điểm của thợ được cập nhật');
select is((select count(*)::int from public.notifications where user_id = tests.get_uid('cust') and type = 'quote_received'), 3,
  'thông báo: chủ nhận quote_received cho báo giá mới / gửi lại (sửa giá không báo lại)');
select is((select count(*)::int from public.notifications where user_id = tests.get_uid('pro1') and type = 'quote_accepted'), 1,
  'thông báo: thợ được chọn nhận quote_accepted');
select is((select count(*)::int from public.notifications where user_id = tests.get_uid('pro2') and type = 'quote_declined'), 1,
  'thông báo: thợ bị từ chối nhận quote_declined');
select is((select count(*)::int from public.notifications where user_id = tests.get_uid('cust') and type = 'new_message'), 1,
  'thông báo: chủ nhận new_message từ thợ');
select is((select count(*)::int from information_schema.columns
           where table_schema = 'public' and table_name = 'public_service_requests' and column_name in ('address_text', 'location')), 0,
  'view công khai: không có địa chỉ / vị trí chính xác');
select is((select public from storage.buckets where id = 'request-images'), true, 'bucket request-images công khai');

-- ── huỷ yêu cầu ─────────────────────────────────────────────────────────────────
select tests.authenticate_as('pro1');
select lives_ok(format($$ select public.submit_quote_tx('%s', 200000) $$, (select id from t_r where name = 'cancel')), 'pro1: báo giá yêu cầu sắp bị huỷ');
select tests.authenticate_as('cust');
select lives_ok(format($$ select public.cancel_request('%s') $$, (select id from t_r where name = 'cancel')), 'cust: huỷ yêu cầu');
select throws_ok(format($$ select public.cancel_request('%s') $$, (select id from t_r where name = 'cancel')),
  'P0001', 'request_closed', 'cust: không huỷ lại yêu cầu đã huỷ');
select tests.authenticate_as('pro1');
select is((select quote_status::text from public.my_service_quotes where request_id = (select id from t_r where name = 'cancel')), 'declined',
  'pro1: báo giá bị từ chối khi chủ huỷ, vẫn thấy qua my_service_quotes');
select tests.authenticate_as('outsider');
select is((select count(*)::int from public.public_service_requests where id = (select id from t_r where name = 'cancel')), 0,
  'outsider: yêu cầu đã huỷ không còn công khai');

-- ── báo cáo ─────────────────────────────────────────────────────────────────────
select tests.authenticate_as('cust');
select throws_ok(format($$ insert into public.reports (target_type, target_id, reason) values ('service_request', '%s', 'spam') $$, (select id from t_r where name = 'staff')),
  'P0001', 'invalid_input', 'cust: không tự báo cáo yêu cầu của mình');
select tests.authenticate_as('outsider');
select lives_ok(format($$ insert into public.reports (target_type, target_id, reason) values ('service_request', '%s', 'scam') $$, (select id from t_r where name = 'staff')),
  'outsider: báo cáo yêu cầu');

-- ── bị cấm ──────────────────────────────────────────────────────────────────────
select tests.authenticate_as('bad');
select throws_ok($$ insert into public.service_requests (trade, title) values ('hvac', 'Bị cấm vẫn đăng') $$,
  '42501', null, 'bị cấm: không đăng yêu cầu');
select throws_ok(format($$ select public.submit_quote_tx('%s', 100000) $$, (select id from t_r where name = 'staff')),
  'P0001', 'banned', 'bị cấm: không báo giá');

-- ── moderator / staff huỷ ───────────────────────────────────────────────────────
select tests.authenticate_as('mod');
select ok((select count(*) from public.service_requests) >= 3, 'mod: đọc mọi yêu cầu');
select tests.authenticate_as('outsider');
select throws_ok(format($$ select public.staff_cancel_request('%s', 'vi phạm') $$, (select id from t_r where name = 'staff')),
  '42501', 'forbidden', 'user: không gọi staff_cancel_request');
select tests.authenticate_as('mod');
select lives_ok(format($$ select public.staff_cancel_request('%s', 'Nội dung lừa đảo') $$, (select id from t_r where name = 'staff')),
  'mod: huỷ yêu cầu vi phạm');
reset role;
select is((select count(*)::int from public.audit_log where action = 'service_request.cancel' and target_id = (select id::text from t_r where name = 'staff')), 1,
  'mod: staff_cancel_request ghi audit_log');
select is((select status::text from public.service_requests where id = (select id from t_r where name = 'staff')), 'cancelled',
  'mod: yêu cầu bị huỷ');
select is((select count(*)::int from public.notifications where user_id = tests.get_uid('cust') and type = 'request_cancelled'), 1,
  'mod: chủ nhận thông báo yêu cầu bị huỷ');

-- ── hết hạn (cron) ──────────────────────────────────────────────────────────────
insert into public.service_requests (customer_id, trade, title, expires_at)
values (tests.get_uid('cust'), 'other', 'Yêu cầu cũ đã quá hạn', now() - interval '1 hour');
select is(public.expire_service_requests(), 1, 'cron: yêu cầu quá hạn → expired');
select is((select count(*)::int from public.notifications where user_id = tests.get_uid('cust') and type = 'request_expired'), 1,
  'cron: chủ nhận request_expired');
select tests.clear_auth();
select throws_ok($$ select public.expire_service_requests() $$, '42501', null, 'anon: không gọi expire_service_requests');

select * from finish();
rollback;
