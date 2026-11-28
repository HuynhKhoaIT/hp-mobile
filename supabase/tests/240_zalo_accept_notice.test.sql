-- Tự báo Zalo khi chốt báo giá (migration 20261129140000_zalo_accept_notice): save_zalo_auto / zalo_sender_options chỉ admin,
-- zalo_accept_targets / reserve_zalo_notice chỉ service role, tin báo tính hạn mức nhưng không chờ nghỉ, hết lượt ghi failed.
-- Vai trò: anon, user, moderator (cũng là Zalo CSKH), admin, service role (chạy bằng postgres).
begin;
\ir _helpers.psql
select plan(38);

select tests.create_user('zn_cust');
select tests.create_user('zn_pro');
select tests.create_user('zn_nophone');
select tests.create_user('zn_mod', 'moderator');
select tests.create_user('zn_admin', 'admin');

create temp table t_r (name text primary key, id uuid);
create temp table t_q (name text primary key, id uuid);
create temp table t_m (name text primary key, id uuid);
grant all on t_r, t_q, t_m to authenticated, anon;

reset role;
update public.profiles set phone = '84987654001', full_name = 'Nguyễn Văn Lan' where id = tests.get_uid('zn_cust');
update public.profiles set phone = '84987654002', full_name = 'Trần Hùng' where id = tests.get_uid('zn_pro');
update public.profiles set phone = null where id = tests.get_uid('zn_nophone');
insert into public.zalo_accounts (staff_id, display_name, credentials_enc) values (tests.get_uid('zn_mod'), 'CSKH', 'x');

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select public.save_zalo_auto(false) $$, '42501', null, 'anon: không gọi save_zalo_auto');
select throws_ok($$ select * from public.zalo_sender_options() $$, '42501', null, 'anon: không gọi zalo_sender_options');

-- ── user thường ─────────────────────────────────────────────────────────────────
select tests.authenticate_as('zn_cust');
select throws_ok($$ select public.save_zalo_auto(false) $$, '42501', null, 'user: không đổi cấu hình tự báo');
select throws_ok($$ select * from public.zalo_sender_options() $$, '42501', null, 'user: không xem danh sách Zalo');
select throws_ok($$ select public.zalo_accept_targets('00000000-0000-4000-8000-000000000999') $$, '42501', null, 'user: không gọi zalo_accept_targets');
select throws_ok(format($$ select public.reserve_zalo_notice('%s', '%s', 'accepted_pro', 'x') $$, tests.get_uid('zn_mod'), tests.get_uid('zn_pro')),
  '42501', null, 'user: không gọi reserve_zalo_notice');

-- Dựng yêu cầu + báo giá bằng luồng thật (chưa chốt).
with x as (insert into public.service_requests (trade, title) values ('hvac', 'Sửa điều hòa kêu to') returning id)
insert into t_r select 'main', id from x;
select tests.authenticate_as('zn_pro');
insert into t_q select 'p', public.submit_quote_tx((select id from t_r where name = 'main'), 400000);

-- ── moderator: không ghi ──────────────────────────────────────────────────────────
select tests.authenticate_as('zn_mod');
select throws_ok($$ select public.save_zalo_auto(false) $$, '42501', null, 'moderator: không đổi cấu hình tự báo');
select throws_ok($$ select * from public.zalo_sender_options() $$, '42501', null, 'moderator: không xem danh sách Zalo');
select throws_ok($$ select public.reserve_zalo_notice(auth.uid(), auth.uid(), 'accepted_pro', 'x') $$, '42501', null, 'moderator: không gọi reserve_zalo_notice');

-- ── admin ───────────────────────────────────────────────────────────────────────
select tests.authenticate_as('zn_admin');
select is((select count(*)::int from public.zalo_sender_options() where status = 'connected' and display_name = 'CSKH'), 1, 'admin: thấy tài khoản Zalo CSKH đã kết nối');
select throws_ok($$ select public.save_zalo_auto(true) $$, 'P0001', 'invalid_input', 'bật mà không chọn tài khoản bị từ chối');
select throws_ok($$ select public.save_zalo_auto(true, '00000000-0000-4000-8000-000000000999') $$, 'P0001', 'invalid_input', 'tài khoản chưa kết nối bị từ chối');
select throws_ok(format($$ select public.save_zalo_auto(true, '%s') $$, tests.get_uid('zn_cust')), 'P0001', 'invalid_input', 'người không có Zalo bị từ chối');
select lives_ok(format($$ select public.save_zalo_auto(true, '%s') $$, tests.get_uid('zn_mod')), 'admin: bật tự báo với Zalo CSKH');
select is((select notify_accepted from public.zalo_settings), true, 'cấu hình đã bật');
select is((select auto_sender_id from public.zalo_settings), tests.get_uid('zn_mod'), 'Zalo CSKH đã lưu');
select is((select count(*)::int from public.audit_log where action = 'zalo.settings' and actor_id = tests.get_uid('zn_admin') and meta ? 'has_sender'), 1, 'audit zalo.settings (không chép id tài khoản)');
select is((select count(*)::int from public.audit_log where action = 'zalo.settings' and meta::text like '%' || tests.get_uid('zn_mod')::text || '%'), 0, 'audit không chứa id tài khoản gửi');
select lives_ok($$ select public.save_zalo_template('accepted_customer', 'Chào {{name}}, thợ đã nhận "{{title}}"') $$, 'admin: lưu mẫu tin báo khách');

-- ── service role ────────────────────────────────────────────────────────────────
reset role;
select is(public.zalo_accept_targets((select id from t_r where name = 'main')), null, 'yêu cầu chưa chốt → không gửi (null)');

select tests.authenticate_as('zn_cust');
select lives_ok(format($$ select public.accept_quote_tx('%s') $$, (select id from t_q where name = 'p')), 'khách chốt báo giá (trigger không có webhook cấu hình → không lỗi)');

reset role;
select is((public.zalo_accept_targets((select id from t_r where name = 'main')) ->> 'sender')::uuid, tests.get_uid('zn_mod'), 'targets: người gửi là Zalo CSKH');
select is(public.zalo_accept_targets((select id from t_r where name = 'main')) -> 'customer' ->> 'name', 'Lan', 'targets: tên gọi ngắn của khách');
select is(public.zalo_accept_targets((select id from t_r where name = 'main')) -> 'pro' ->> 'name', 'Hùng', 'targets: tên gọi ngắn của thợ');
select is((public.zalo_accept_targets((select id from t_r where name = 'main')) -> 'pro' ->> 'id')::uuid, tests.get_uid('zn_pro'), 'targets: thợ là người có báo giá được chọn');
select ok((public.zalo_accept_targets((select id from t_r where name = 'main')) -> 'templates') ? 'accepted_customer', 'targets: kèm mẫu tuỳ chỉnh');

select throws_ok(format($$ select public.reserve_zalo_notice('%s', '%s', 'custom', 'x') $$, tests.get_uid('zn_mod'), tests.get_uid('zn_pro')),
  'P0001', 'invalid_input', 'reserve_zalo_notice: loại tin ngoài 2 loại báo bị từ chối');
select throws_ok(format($$ select public.reserve_zalo_notice('%s', '%s', 'accepted_pro', 'x') $$, tests.get_uid('zn_mod'), tests.get_uid('zn_nophone')),
  'P0001', 'no_phone', 'reserve_zalo_notice: người không có SĐT');

insert into t_m select 'c', ((public.reserve_zalo_notice(tests.get_uid('zn_mod'), tests.get_uid('zn_cust'), 'accepted_customer', 'Chào Lan') ->> 'message_id')::uuid);
insert into t_m select 'p', ((public.reserve_zalo_notice(tests.get_uid('zn_mod'), tests.get_uid('zn_pro'), 'accepted_pro', 'Chào Hùng') ->> 'message_id')::uuid);
select ok((select id from t_m where name = 'p') is not null, 'tin thứ hai gửi ngay, không phải chờ thời gian nghỉ');
select is((select sent from public.zalo_quota where staff_id = tests.get_uid('zn_mod') and day = (now() at time zone 'Asia/Ho_Chi_Minh')::date), 2, 'hai tin báo tính vào hạn mức ngày');
select is((select next_allowed_at from public.zalo_quota where staff_id = tests.get_uid('zn_mod') and day = (now() at time zone 'Asia/Ho_Chi_Minh')::date), null, 'tin báo không đặt thời gian nghỉ');
select is((select status || '/' || mode from public.zalo_messages where id = (select id from t_m where name = 'c')), 'sending/auto', 'tin ghi trạng thái sending, mode auto');

select lives_ok(format($$ select public.finish_zalo_auto('%s', false, null, 'user_not_found') $$, (select id from t_m where name = 'p')), 'finish_zalo_auto: đánh dấu lỗi');
select is((select sent from public.zalo_quota where staff_id = tests.get_uid('zn_mod') and day = (now() at time zone 'Asia/Ho_Chi_Minh')::date), 1, 'tin lỗi được hoàn lượt');

-- Hết lượt: ghi tin failed 'limit_reached', không gửi.
update public.zalo_quota set quota = sent where staff_id = tests.get_uid('zn_mod') and day = (now() at time zone 'Asia/Ho_Chi_Minh')::date;
select is(public.reserve_zalo_notice(tests.get_uid('zn_mod'), tests.get_uid('zn_pro'), 'accepted_pro', 'Chào Hùng') ->> 'ok', 'false', 'hết lượt → ok: false');
select is((select count(*)::int from public.zalo_messages where status = 'failed' and error = 'limit_reached'), 1, 'hết lượt ghi tin failed limit_reached');

-- Tắt → không gửi nữa.
select tests.authenticate_as('zn_admin');
select lives_ok($$ select public.save_zalo_auto(false) $$, 'admin: tắt tự báo');
reset role;
select is(public.zalo_accept_targets((select id from t_r where name = 'main')), null, 'đã tắt → không gửi (null)');

select * from finish();
rollback;
