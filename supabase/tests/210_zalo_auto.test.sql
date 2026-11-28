-- Gửi Zalo tự động (migration 20261129110000_zalo_auto): quyền đọc zalo_accounts / zalo_qr_sessions (client không đọc được
-- credentials_enc), RPC reserve_zalo_auto / finish_zalo_auto chỉ service role, hạn mức + hoàn lượt khi gửi lỗi, audit không lộ
-- SĐT / nội dung. Vai trò: anon, user, moderator, admin, service role (chạy bằng postgres).
begin;
\ir _helpers.psql
select plan(32);

select tests.create_user('za_user');
select tests.create_user('za_mod', 'moderator');
select tests.create_user('za_admin', 'admin');
select tests.create_user('za_target');   -- người dùng có SĐT
select tests.create_user('za_google');   -- người dùng không có SĐT

create temp table t_m (name text primary key, id uuid);
grant all on t_m to authenticated, anon;

reset role;
update public.profiles set phone = null where id = tests.get_uid('za_google');
insert into public.marketing_leads (id, contact, contact_type, kind, consent_at, consent_version)
values ('00000000-0000-4000-8000-0000000a2001', '84987654321', 'phone', 'landlord', now(), 'v1');
insert into public.zalo_accounts (staff_id, zalo_uid, display_name, credentials_enc)
values (tests.get_uid('za_mod'), '1234', 'Staff Zalo', 'secret-blob'), (tests.get_uid('za_admin'), '5678', 'Admin Zalo', 'secret-blob-2');
insert into public.zalo_qr_sessions (staff_id, status) values (tests.get_uid('za_mod'), 'waiting_scan'), (tests.get_uid('za_admin'), 'scanned');

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select count(*) from public.zalo_accounts $$, '42501', null, 'anon: không đọc zalo_accounts');
select throws_ok($$ select count(*) from public.zalo_qr_sessions $$, '42501', null, 'anon: không đọc zalo_qr_sessions');

-- ── user thường ─────────────────────────────────────────────────────────────────
select tests.authenticate_as('za_user');
select is((select count(*)::int from public.zalo_accounts), 0, 'user: không thấy tài khoản Zalo nào (RLS)');
select is((select count(*)::int from public.zalo_qr_sessions), 0, 'user: không thấy phiên QR nào (RLS)');

-- ── moderator: chỉ đọc dòng của mình, không đọc credentials, không ghi ─────────────────────────────
select tests.authenticate_as('za_mod');
select is((select string_agg(display_name, ',') from (select display_name from public.zalo_accounts) s), 'Staff Zalo',
  'moderator: chỉ thấy tài khoản Zalo của mình (không thấy của admin)');
select throws_ok($$ select credentials_enc from public.zalo_accounts $$, '42501', null, 'moderator: không đọc được credentials_enc');
select throws_ok($$ select * from public.zalo_accounts $$, '42501', null, 'moderator: select * bị chặn vì có cột credentials_enc');
select is((select count(*)::int from public.zalo_qr_sessions), 1, 'moderator: chỉ thấy phiên QR của mình');
select throws_ok(format($$ insert into public.zalo_accounts (staff_id, credentials_enc) values ('%s', 'x') $$, tests.get_uid('za_mod')),
  '42501', null, 'moderator: không tự thêm tài khoản Zalo');
select throws_ok($$ update public.zalo_accounts set status = 'expired' $$, '42501', null, 'moderator: không sửa tài khoản Zalo');
select throws_ok(format($$ select public.reserve_zalo_auto('%s', 'lead', '00000000-0000-4000-8000-0000000a2001', 'custom', 'x') $$, tests.get_uid('za_mod')),
  '42501', null, 'moderator: không gọi reserve_zalo_auto (chỉ service role)');
select throws_ok($$ select public.finish_zalo_auto(gen_random_uuid(), true) $$, '42501', null, 'moderator: không gọi finish_zalo_auto');

-- ── service role (postgres): hạn mức, gửi, hoàn lượt ───────────────────────────────────────────
reset role;
insert into t_m select 'r1', (public.reserve_zalo_auto(tests.get_uid('za_mod'), 'lead', '00000000-0000-4000-8000-0000000a2001', 'lead_reply', '  Xin chào  ') ->> 'message_id')::uuid;
select isnt((select id from t_m where name = 'r1'), null, 'service: reserve_zalo_auto ghi tin');
select is((public.reserve_zalo_auto(tests.get_uid('za_mod'), 'lead', '00000000-0000-4000-8000-0000000a2001', 'custom', 'tin hai') ->> 'reason'), 'waiting',
  'service: tin thứ hai ngay sau đó → waiting');
select is((select mode || '/' || status || '/' || content from public.zalo_messages where id = (select id from t_m where name = 'r1')),
  'auto/sending/Xin chào', 'tin auto ở trạng thái sending, nội dung đã cắt khoảng trắng');
select is((select sent from public.zalo_quota where staff_id = tests.get_uid('za_mod')), 1, 'đã trừ 1 lượt');

select lives_ok(format($$ select public.finish_zalo_auto('%s', true, 'msg-123') $$, (select id from t_m where name = 'r1')), 'service: finish thành công');
select is((select status || '/' || zalo_msg_id from public.zalo_messages where id = (select id from t_m where name = 'r1')), 'sent/msg-123',
  'tin chuyển sent + lưu id tin Zalo');
select throws_ok(format($$ select public.finish_zalo_auto('%s', true) $$, (select id from t_m where name = 'r1')),
  'P0001', 'not_found', 'service: finish lần hai (đã sent) → not_found');

update public.zalo_quota set next_allowed_at = null where staff_id = tests.get_uid('za_mod');
insert into t_m select 'r3', (public.reserve_zalo_auto(tests.get_uid('za_mod'), 'user', tests.get_uid('za_target'), 'rating_request', 'Mời đánh giá') ->> 'message_id')::uuid;
select isnt((select id from t_m where name = 'r3'), null, 'service: hết nghỉ → reserve tiếp được (người dùng có SĐT)');
select lives_ok(format($$ select public.finish_zalo_auto('%s', false, null, 'session_expired') $$, (select id from t_m where name = 'r3')), 'service: finish lỗi');
select is((select status || '/' || error from public.zalo_messages where id = (select id from t_m where name = 'r3')), 'failed/session_expired',
  'tin lỗi chuyển failed + lưu lý do');
select is((select sent from public.zalo_quota where staff_id = tests.get_uid('za_mod')), 1, 'gửi lỗi → hoàn lượt (sent về 1, chỉ còn tin đã gửi)');
select is((select next_allowed_at from public.zalo_quota where staff_id = tests.get_uid('za_mod')), null, 'gửi lỗi → bỏ thời gian nghỉ để thử lại ngay');

-- ── lỗi nghiệp vụ ───────────────────────────────────────────────────────────────
select throws_ok(format($$ select public.reserve_zalo_auto('%s', 'lead', '00000000-0000-4000-8000-0000000a2001', 'custom', 'x') $$, tests.get_uid('za_user')),
  '42501', 'forbidden', 'service: người không phải staff → forbidden');
select throws_ok(format($$ select public.reserve_zalo_auto('%s', 'lead', '00000000-0000-4000-8000-0000000a2001', 'khong_co', 'x') $$, tests.get_uid('za_mod')),
  'P0001', 'invalid_input', 'service: loại tin lạ → invalid_input');
select throws_ok(format($$ select public.reserve_zalo_auto('%s', 'user', gen_random_uuid(), 'custom', 'x') $$, tests.get_uid('za_mod')),
  'P0001', 'not_found', 'service: đối tượng không có → not_found');
select throws_ok(format($$ select public.reserve_zalo_auto('%s', 'user', '%s', 'custom', 'x') $$, tests.get_uid('za_mod'), tests.get_uid('za_google')),
  'P0001', 'no_phone', 'service: người dùng không có SĐT → no_phone');

-- ── audit + đường bán tự động không đổi ─────────────────────────────────────────
select is((select count(*)::int from public.audit_log where action = 'zalo.send' and actor_id = tests.get_uid('za_mod') and meta ->> 'mode' = 'auto'), 2,
  'audit ghi zalo.send mode auto cho mỗi tin đã giữ chỗ');
select is((select count(*)::int from public.audit_log where action = 'zalo.send'
            and (meta::text like '%987654321%' or meta::text like '%Xin chào%' or meta::text like '%đánh giá%')), 0,
  'audit không chép SĐT / nội dung tin');
select tests.authenticate_as('za_admin');
select is((public.reserve_zalo_message('lead', '00000000-0000-4000-8000-0000000a2001', 'custom', 'tin bán tự động') ->> 'ok')::boolean, true,
  'admin: reserve_zalo_message (bán tự động) vẫn chạy');
reset role;
select is((select mode || '/' || status from public.zalo_messages where staff_id = tests.get_uid('za_admin')), 'manual/recorded',
  'tin bán tự động mặc định manual / recorded');

select * from finish();
rollback;
