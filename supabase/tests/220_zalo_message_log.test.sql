-- Nhật ký tin Zalo (migration 20261129120000_zalo_message_log): view zalo_message_log chỉ staff đọc được, có tên người gửi /
-- người nhận, không có SĐT. Vai trò: anon, user, bị cấm, moderator, admin.
begin;
\ir _helpers.psql
select plan(12);

select tests.create_user('zl_user');
select tests.create_user('zl_banned');
select tests.ban_user('zl_banned');
select tests.create_user('zl_mod', 'moderator');
select tests.create_user('zl_admin', 'admin');
select tests.create_user('zl_target');

reset role;
insert into public.marketing_leads (id, name, contact, contact_type, kind, consent_at, consent_version)
values ('00000000-0000-4000-8000-0000000a3001', 'Chủ trọ Lan', '84987654322', 'phone', 'landlord', now(), 'v1');
insert into public.zalo_messages (id, staff_id, target_type, target_id, kind, content, mode, status)
values
  ('00000000-0000-4000-8000-0000000a3101', tests.get_uid('zl_mod'), 'lead', '00000000-0000-4000-8000-0000000a3001', 'lead_reply', 'Tin gửi lead', 'auto', 'sent'),
  ('00000000-0000-4000-8000-0000000a3102', tests.get_uid('zl_admin'), 'user', tests.get_uid('zl_target'), 'custom', 'Tin gửi người dùng', 'manual', 'recorded'),
  ('00000000-0000-4000-8000-0000000a3103', tests.get_uid('zl_admin'), 'lead', '00000000-0000-4000-8000-0000000a3001', 'custom', 'Tin lỗi', 'auto', 'failed');

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select count(*) from public.zalo_message_log $$, '42501', null, 'anon: không đọc zalo_message_log');

-- ── user thường và bị cấm: 0 dòng ──────────────────────────────────────────────────
select tests.authenticate_as('zl_user');
select is((select count(*)::int from public.zalo_message_log), 0, 'user: không thấy tin nào');
select tests.authenticate_as('zl_banned');
select is((select count(*)::int from public.zalo_message_log), 0, 'bị cấm: không thấy tin nào');

-- ── moderator: thấy mọi tin, kèm tên ──────────────────────────────────────────────
select tests.authenticate_as('zl_mod');
select is((select count(*)::int from public.zalo_message_log where id::text like '00000000-0000-4000-8000-0000000a31%'), 3,
  'moderator: thấy cả tin của mình và của admin');
select is((select target_name from public.zalo_message_log where id = '00000000-0000-4000-8000-0000000a3101'), 'Chủ trọ Lan',
  'tên người nhận là lead');
select is((select target_name from public.zalo_message_log where id = '00000000-0000-4000-8000-0000000a3102'), 'Test zl_target',
  'tên người nhận là người dùng');
select is((select staff_name from public.zalo_message_log where id = '00000000-0000-4000-8000-0000000a3102'), 'Test zl_admin',
  'có tên người gửi');
select is((select mode || '/' || status from public.zalo_message_log where id = '00000000-0000-4000-8000-0000000a3103'), 'auto/failed',
  'có kiểu gửi và trạng thái');
select is((select count(*)::int from public.zalo_message_log where status = 'failed' and id::text like '00000000-0000-4000-8000-0000000a31%'), 1,
  'lọc theo trạng thái lỗi');
select is((select count(*)::int from information_schema.columns
  where table_schema = 'public' and table_name = 'zalo_message_log' and column_name in ('phone', 'contact')), 0,
  'view không có cột SĐT / liên hệ');
select throws_ok($$ insert into public.zalo_message_log (id) values (gen_random_uuid()) $$, '55000', null, 'moderator: không ghi được vào view (chỉ đọc)');

-- ── admin ───────────────────────────────────────────────────────────────────────
select tests.authenticate_as('zl_admin');
select is((select count(*)::int from public.zalo_message_log where id::text like '00000000-0000-4000-8000-0000000a31%'), 3, 'admin: thấy mọi tin');

select * from finish();
rollback;
