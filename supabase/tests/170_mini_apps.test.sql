-- Cấu hình bật / tắt mini-app (migration 20261127090000_mini_apps): ai đọc, ai sửa, audit.
-- 5 vai trò: anon, user, bị cấm, moderator, admin.
begin;
\ir _helpers.psql
select plan(17);

select tests.create_user('ma_user');
select tests.create_user('ma_banned');
select tests.ban_user('ma_banned');
select tests.create_user('ma_mod', 'moderator');
select tests.create_user('ma_admin', 'admin');

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select is((select count(*)::int from public.mini_apps), 7, 'anon: đọc đủ 7 mini-app');
select is((select is_enabled from public.mini_apps where code = 'goiTho'), false, 'goiTho tắt mặc định');
select is((select count(*)::int from public.mini_apps where is_enabled), 6, '6 mini-app hiện có đang bật');
select throws_ok($$ update public.mini_apps set is_enabled = false where code = 'pass' $$, '42501', 'anon: không sửa');
select throws_ok($$ insert into public.mini_apps (code) values ('pass') $$, '42501', 'anon: không thêm');

-- ── user ────────────────────────────────────────────────────────────────────────
select tests.authenticate_as('ma_user');
select is((with u as (update public.mini_apps set is_enabled = false where code = 'pass' returning 1) select count(*)::int from u), 0,
  'user: update không chạm dòng nào (RLS chỉ admin)');
select throws_ok($$ insert into public.mini_apps (code, is_enabled) values ('pass', true) $$, '42501', 'user: không thêm');
select throws_ok($$ delete from public.mini_apps where code = 'pass' $$, '42501', 'user: không xoá');
select throws_ok($$ update public.mini_apps set code = 'khac' where code = 'pass' $$, '42501', 'user: không đổi mã (chỉ is_enabled, sort_order)');

-- ── bị cấm ──────────────────────────────────────────────────────────────────────
select tests.authenticate_as('ma_banned');
select is((with u as (update public.mini_apps set is_enabled = false where code = 'pass' returning 1) select count(*)::int from u), 0,
  'bị cấm: không sửa được');

-- ── moderator ───────────────────────────────────────────────────────────────────
select tests.authenticate_as('ma_mod');
select is((with u as (update public.mini_apps set is_enabled = false where code = 'pass' returning 1) select count(*)::int from u), 0,
  'moderator: không sửa (chỉ admin)');

-- ── admin ───────────────────────────────────────────────────────────────────────
select tests.authenticate_as('ma_admin');
select lives_ok($$ update public.mini_apps set is_enabled = true, sort_order = 5 where code = 'goiTho' $$, 'admin: bật goiTho + đổi thứ tự');
select is((select is_enabled from public.mini_apps where code = 'goiTho'), true, 'goiTho đã bật');
select is((select updated_by from public.mini_apps where code = 'goiTho'), tests.get_uid('ma_admin'), 'updated_by = admin vừa sửa');
select is((select count(*)::int from public.audit_log where action = 'mini_app.update' and target_id = 'goiTho'), 1,
  'audit_log ghi mini_app.update');
select throws_ok($$ update public.mini_apps set updated_by = null where code = 'goiTho' $$, '42501', 'admin: không sửa tay updated_by');

-- ── ràng buộc mã (postgres) ─────────────────────────────────────────────────────
reset role;
select throws_ok($$ insert into public.mini_apps (code) values ('khong_co') $$, '23514', 'mã mini-app ngoài danh sách bị CHECK chặn');

select * from finish();
rollback;
