-- Nhắn Zalo bán tự động cho staff (migration 20261129090000_zalo_outreach): ai gọi được, hạn mức, thời gian nghỉ, audit,
-- không lộ SĐT vào nhật ký / audit. 5 vai trò: anon, user, bị cấm, moderator, admin.
begin;
\ir _helpers.psql
select plan(31);

select tests.create_user('zo_user');
select tests.create_user('zo_banned');
select tests.ban_user('zo_banned');
select tests.create_user('zo_mod', 'moderator');
select tests.create_user('zo_admin', 'admin');
select tests.create_user('zo_target');    -- người dùng có SĐT (tests.create_user gán 8491000xxxx)
select tests.create_user('zo_google');    -- người dùng không có SĐT (đăng nhập Google)

-- Dữ liệu chuẩn bị bằng postgres: lead SĐT, lead email, người dùng không SĐT.
reset role;
update public.profiles set phone = null where id = tests.get_uid('zo_google');
insert into public.marketing_leads (id, contact, contact_type, kind, consent_at, consent_version)
values ('00000000-0000-4000-8000-0000000a0001', '84912345678', 'phone', 'landlord', now(), 'v1'),
       ('00000000-0000-4000-8000-0000000a0002', 'chu.tro@example.com', 'email', 'landlord', now(), 'v1');

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select public.zalo_status() $$, '42501', null, 'anon: không gọi zalo_status');
select throws_ok($$ select public.reserve_zalo_message('lead', '00000000-0000-4000-8000-0000000a0001', 'custom', 'x') $$,
  '42501', null, 'anon: không gọi reserve_zalo_message');
select throws_ok($$ select count(*) from public.zalo_messages $$, '42501', null, 'anon: không đọc nhật ký');
select throws_ok($$ select count(*) from public.zalo_quota $$, '42501', null, 'anon: không đọc hạn mức');

-- ── user + bị cấm ───────────────────────────────────────────────────────────────
select tests.authenticate_as('zo_user');
select throws_ok($$ select public.zalo_status() $$, '42501', 'forbidden', 'user: zalo_status → forbidden');
select throws_ok($$ select public.reserve_zalo_message('lead', '00000000-0000-4000-8000-0000000a0001', 'custom', 'x') $$,
  '42501', 'forbidden', 'user: reserve_zalo_message → forbidden');
select throws_ok($$ select count(*) from public.zalo_quota $$, '42501', null, 'user: không đọc hạn mức (không grant)');
select throws_ok($$ insert into public.zalo_messages (staff_id, target_type, target_id, kind, content)
  values (auth.uid(), 'lead', '00000000-0000-4000-8000-0000000a0001', 'custom', 'x') $$, '42501', null, 'user: không ghi nhật ký trực tiếp');
select tests.authenticate_as('zo_banned');
select throws_ok($$ select public.zalo_status() $$, '42501', 'forbidden', 'bị cấm: zalo_status → forbidden');

-- ── moderator: hạn mức ──────────────────────────────────────────────────────────
select tests.authenticate_as('zo_mod');
select ok((public.zalo_status() ->> 'quota')::int between 15 and 30, 'moderator: hạn mức ngày ngẫu nhiên trong 15..30');
select is((public.zalo_status() ->> 'sent')::int, 0, 'moderator: hôm nay chưa gửi tin nào');
select is((public.zalo_status() ->> 'can_send')::boolean, true, 'moderator: còn gửi được');

-- ── moderator: ghi nhận tin cho lead SĐT ────────────────────────────────────────
select is((public.reserve_zalo_message('lead', '00000000-0000-4000-8000-0000000a0001', 'lead_reply', '  Chào anh, cảm ơn đã quan tâm  ') ->> 'zalo_url'),
  'https://zalo.me/0912345678', 'moderator: link zalo.me dạng 0xxxxxxxxx tới SĐT của lead');
select is((public.zalo_status() ->> 'sent')::int, 1, 'đã trừ 1 lượt');
select is((public.zalo_status() ->> 'reason'), 'waiting', 'ngay sau khi gửi phải nghỉ (waiting)');
select ok((public.zalo_status() ->> 'wait_seconds')::int >= 1, 'có số giây nghỉ còn lại');
select is((public.reserve_zalo_message('lead', '00000000-0000-4000-8000-0000000a0001', 'custom', 'tin thứ hai') ->> 'ok')::boolean, false,
  'đang nghỉ → ok=false, không ghi thêm');
select is((select count(*)::int from public.zalo_messages where staff_id = tests.get_uid('zo_mod')), 1, 'nhật ký chỉ có 1 tin (tin bị từ chối không ghi)');
select is((select content from public.zalo_messages where staff_id = tests.get_uid('zo_mod')), 'Chào anh, cảm ơn đã quan tâm', 'nội dung đã được cắt khoảng trắng');

-- ── hết thời gian nghỉ → gửi tiếp được; hết lượt → limit_reached ─────────────────
reset role;
update public.zalo_quota set next_allowed_at = now() - interval '1 second' where staff_id = tests.get_uid('zo_mod');
select tests.authenticate_as('zo_mod');
select is((public.reserve_zalo_message('user', tests.get_uid('zo_target'), 'warning', 'Nhắc nhở nhẹ') ->> 'ok')::boolean, true,
  'hết thời gian nghỉ: gửi tiếp cho người dùng có SĐT');
reset role;
update public.zalo_quota set sent = quota, next_allowed_at = null where staff_id = tests.get_uid('zo_mod');
select tests.authenticate_as('zo_mod');
select is((public.reserve_zalo_message('lead', '00000000-0000-4000-8000-0000000a0001', 'custom', 'quá hạn mức') ->> 'reason'), 'limit_reached',
  'hết hạn mức ngày → limit_reached');

-- ── lỗi nghiệp vụ (không trừ lượt) ──────────────────────────────────────────────
reset role;
update public.zalo_quota set sent = 0, next_allowed_at = null where staff_id = tests.get_uid('zo_mod');
select tests.authenticate_as('zo_mod');
select throws_ok($$ select public.reserve_zalo_message('lead', '00000000-0000-4000-8000-0000000a0002', 'custom', 'x') $$,
  'P0001', 'no_phone', 'lead chỉ có email → no_phone');
select throws_ok($$ select public.reserve_zalo_message('user', gen_random_uuid(), 'custom', 'x') $$,
  'P0001', 'not_found', 'đối tượng không tồn tại → not_found');
select throws_ok($$ select public.reserve_zalo_message('user', tests.get_uid('zo_google'), 'custom', 'x') $$,
  'P0001', 'no_phone', 'người dùng không có SĐT (Google) → no_phone');
select throws_ok($$ select public.reserve_zalo_message('lead', '00000000-0000-4000-8000-0000000a0001', 'khong_co', 'x') $$,
  'P0001', 'invalid_input', 'loại tin lạ → invalid_input');
select throws_ok($$ select public.reserve_zalo_message('lead', '00000000-0000-4000-8000-0000000a0001', 'custom', '   ') $$,
  'P0001', 'invalid_input', 'nội dung rỗng → invalid_input');

-- ── audit + riêng tư ────────────────────────────────────────────────────────────
reset role;
select is((select count(*)::int from public.audit_log where action = 'zalo.send' and actor_id = tests.get_uid('zo_mod')), 2,
  'audit_log ghi zalo.send cho mỗi tin đã ghi nhận');
select is((select count(*)::int from public.audit_log where action = 'zalo.send'
            and (meta::text like '%912345678%' or meta::text like '%Chào anh%')), 0, 'audit không chép SĐT / nội dung tin');
select is((select count(*)::int from public.zalo_messages where content like '%84912345678%' or content like '%0912345678%'), 0,
  'nhật ký không lưu SĐT');

-- ── admin: đọc nhật ký của staff khác, hạn mức độc lập ──────────────────────────
select tests.authenticate_as('zo_admin');
select is((select count(*)::int from public.zalo_messages where staff_id = tests.get_uid('zo_mod')), 2, 'admin: đọc được nhật ký của staff khác');
select is((public.zalo_status() ->> 'sent')::int, 0, 'admin: hạn mức riêng, chưa gửi tin nào');

select * from finish();
rollback;
