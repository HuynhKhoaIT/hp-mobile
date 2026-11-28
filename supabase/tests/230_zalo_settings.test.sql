-- Cấu hình Zalo + mẫu tin (migration 20261129130000_zalo_settings): quyền đọc zalo_settings / zalo_templates (staff), RPC ghi chỉ admin
-- (kiểm tra đầu vào, audit không chép nội dung), hạ trần hạn mức có hiệu lực ngay, reserve_zalo_auto dùng thời gian nghỉ từ cấu hình.
-- Vai trò: anon, user, moderator, admin, service role (chạy bằng postgres).
begin;
\ir _helpers.psql
select plan(29);

select tests.create_user('zs_user');
select tests.create_user('zs_mod', 'moderator');
select tests.create_user('zs_admin', 'admin');

reset role;
insert into public.zalo_templates (kind, content) values ('lead_reply', 'Mẫu thử');
insert into public.marketing_leads (id, contact, contact_type, kind, consent_at, consent_version)
values ('00000000-0000-4000-8000-0000000a4001', '84987654323', 'phone', 'landlord', now(), 'v1');
select public.zalo_today(tests.get_uid('zs_mod'));   -- tạo lượt hôm nay (15..30) trước khi đổi cấu hình

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select count(*) from public.zalo_settings $$, '42501', null, 'anon: không đọc zalo_settings');
select throws_ok($$ select count(*) from public.zalo_templates $$, '42501', null, 'anon: không đọc zalo_templates');
select throws_ok($$ select public.save_zalo_settings(1, 3, 30, 60) $$, '42501', null, 'anon: không gọi save_zalo_settings');

-- ── user thường ─────────────────────────────────────────────────────────────────
select tests.authenticate_as('zs_user');
select is((select count(*)::int from public.zalo_settings), 0, 'user: không thấy cấu hình (RLS)');
select is((select count(*)::int from public.zalo_templates), 0, 'user: không thấy mẫu tin (RLS)');
select throws_ok($$ select public.save_zalo_settings(1, 3, 30, 60) $$, '42501', null, 'user: không đổi cấu hình');
select throws_ok($$ select public.save_zalo_template('custom', 'x') $$, '42501', null, 'user: không đổi mẫu tin');

-- ── moderator: đọc được, không ghi ──────────────────────────────────────────────────
select tests.authenticate_as('zs_mod');
select is((select daily_min || '-' || daily_max || '-' || delay_min || '-' || delay_max from public.zalo_settings), '15-30-60-180',
  'moderator: đọc cấu hình mặc định 15-30 / 60-180');
select is((select count(*)::int from public.zalo_templates), 1, 'moderator: đọc mẫu tin');
select throws_ok($$ select public.save_zalo_settings(1, 3, 30, 60) $$, '42501', null, 'moderator: không đổi cấu hình');
select throws_ok($$ select public.save_zalo_template('custom', 'x') $$, '42501', null, 'moderator: không đổi mẫu tin');
select throws_ok($$ select public.reset_zalo_template('lead_reply') $$, '42501', null, 'moderator: không khôi phục mẫu tin');
select throws_ok($$ select public.zalo_random_delay() $$, '42501', null, 'moderator: không gọi hàm nội bộ zalo_random_delay');

-- ── admin ───────────────────────────────────────────────────────────────────────
select tests.authenticate_as('zs_admin');
select lives_ok($$ select public.save_zalo_settings(1, 3, 30, 60) $$, 'admin: đổi cấu hình');
select is((select daily_min || '-' || daily_max || '-' || delay_min || '-' || delay_max from public.zalo_settings), '1-3-30-60', 'cấu hình đã lưu');
select throws_ok($$ select public.save_zalo_settings(1, 60, 30, 60) $$, 'P0001', 'invalid_input', 'hạn mức ngày > 50 bị từ chối');
select throws_ok($$ select public.save_zalo_settings(1, 3, 10, 60) $$, 'P0001', 'invalid_input', 'nghỉ < 30 giây bị từ chối');
select throws_ok($$ select public.save_zalo_settings(1, 3, 60, 40) $$, 'P0001', 'invalid_input', 'nghỉ tối đa < tối thiểu bị từ chối');
select lives_ok($$ select public.save_zalo_template('custom', '  Chào {{name}}  ') $$, 'admin: lưu mẫu tin');
select is((select content from public.zalo_templates where kind = 'custom'), 'Chào {{name}}', 'mẫu tin đã cắt khoảng trắng');
select throws_ok($$ select public.save_zalo_template('khong_co', 'x') $$, 'P0001', 'invalid_input', 'loại tin lạ bị từ chối');
select throws_ok($$ select public.save_zalo_template('custom', '   ') $$, 'P0001', 'invalid_input', 'mẫu rỗng bị từ chối');
select lives_ok($$ select public.reset_zalo_template('custom') $$, 'admin: khôi phục mặc định');
select is((select count(*)::int from public.zalo_templates where kind = 'custom'), 0, 'mẫu đã bị xoá (quay về mặc định)');
select is((select count(*)::int from public.audit_log where action = 'zalo.settings' and actor_id = tests.get_uid('zs_admin')), 1, 'audit zalo.settings');
select is((select count(*)::int from public.audit_log where action = 'zalo.template' and actor_id = tests.get_uid('zs_admin')), 2, 'audit zalo.template (lưu + khôi phục)');
select is((select count(*)::int from public.audit_log where action = 'zalo.template' and meta ? 'content'), 0, 'audit mẫu tin không chép nội dung');

-- ── service role: thời gian nghỉ lấy từ cấu hình (30..60 giây) ───────────────────────────────
reset role;
select ok((select quota from public.zalo_quota where staff_id = tests.get_uid('zs_mod') and day = (now() at time zone 'Asia/Ho_Chi_Minh')::date) <= 3,
  'hạ trần: lượt hôm nay của staff bị kẹp về ≤ 3');
select ok(
  ((public.reserve_zalo_auto(tests.get_uid('zs_mod'), 'lead', '00000000-0000-4000-8000-0000000a4001', 'custom', 'x') -> 'status' ->> 'wait_seconds')::int) between 29 and 60,
  'reserve_zalo_auto: thời gian nghỉ nằm trong [30, 60] theo cấu hình');

select * from finish();
rollback;
