-- profiles, public_profiles, helper quyền, guard, hook JWT — anon / user / banned / moderator / admin.
begin;
\ir _helpers.psql
select plan(27);

select tests.create_user('user_a');
select tests.create_user('user_b');
select tests.create_user('bad');
select tests.ban_user('bad');
select tests.create_user('mod', 'moderator');
select tests.create_user('boss', 'admin');
update public.profiles set full_name = 'Nguyễn Văn An' where id = tests.get_uid('user_a');

-- ── Trigger tạo profile ─────────────────────────────────────────────────────────
select is((select badges from public.profiles where id = tests.get_uid('user_a')), array['phone'],
  'user mới đăng ký bằng SĐT có huy hiệu phone');
select is((select locale from public.profiles where id = tests.get_uid('user_a')), 'vi', 'locale mặc định vi');

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select * from public.profiles limit 1 $$, '42501', null, 'anon: không đọc bảng profiles');
select is((select display_name from public.public_profiles where id = tests.get_uid('user_a')), 'An N.',
  'anon: đọc public_profiles, tên rút gọn "tên + chữ cái họ"');
select ok(not public.is_staff(), 'anon: is_staff() = false');
reset role;
select hasnt_column('public', 'public_profiles', 'phone', 'public_profiles không có phone');
select hasnt_column('public', 'public_profiles', 'full_name', 'public_profiles không có full_name');
select hasnt_column('public', 'public_profiles', 'push_tokens', 'public_profiles không có push_tokens');

-- ── user ────────────────────────────────────────────────────────────────────────
select tests.authenticate_as('user_a');
select is((select count(*)::int from public.profiles), 1, 'user: chỉ thấy profile của mình');
select lives_ok($$ update public.profiles set full_name = 'An Mới', locale = 'en' where id = tests.get_uid('user_a') $$,
  'user: sửa tên, ngôn ngữ của mình');
select throws_ok($$ update public.profiles set role = 'admin' where id = tests.get_uid('user_a') $$, '42501', null,
  'user: không tự nâng role');
select throws_ok($$ update public.profiles set badges = array['phone','landlord'] where id = tests.get_uid('user_a') $$, '42501', null,
  'user: không tự thêm huy hiệu');
select throws_ok($$ update public.profiles set rating_avg = 5 where id = tests.get_uid('user_a') $$, '42501', null,
  'user: không sửa điểm đánh giá');
select throws_ok($$ update public.profiles set phone = '84999999999' where id = tests.get_uid('user_a') $$, '42501', null,
  'user: không sửa SĐT trực tiếp');
update public.profiles set full_name = 'Hack' where id = tests.get_uid('user_b');
reset role;
select isnt((select full_name from public.profiles where id = tests.get_uid('user_b')), 'Hack',
  'user: sửa profile người khác không có tác dụng (RLS)');

-- ── banned ──────────────────────────────────────────────────────────────────────
select tests.authenticate_as('bad');
select ok(public.is_banned(), 'banned: is_banned() = true');
select tests.authenticate_as('user_a');
select ok(not public.is_banned(), 'user thường: is_banned() = false');

-- ── moderator ───────────────────────────────────────────────────────────────────
select tests.authenticate_as('mod');
select ok(public.is_staff(), 'moderator: is_staff()');
select ok(not public.is_admin(), 'moderator: không phải admin');
select ok((select count(*) from public.profiles) >= 5, 'moderator: đọc mọi profile');
select lives_ok($$ update public.profiles set banned_until = now() + interval '7 days' where id = tests.get_uid('user_b') $$,
  'moderator: khoá tạm 7 ngày');
select throws_ok($$ update public.profiles set is_banned = true where id = tests.get_uid('user_b') $$, '42501', null,
  'moderator: không cấm vĩnh viễn');
select throws_ok($$ update public.profiles set role = 'admin' where id = tests.get_uid('mod') $$, '42501', null,
  'moderator: không đổi role');
select tests.authenticate_as('user_b');
select ok(public.is_banned(), 'user bị khoá tạm: is_banned() = true');

-- ── admin ───────────────────────────────────────────────────────────────────────
select tests.authenticate_as('boss');
select lives_ok($$ update public.profiles set role = 'moderator' where id = tests.get_uid('user_a') $$, 'admin: đổi role');
reset role;

-- ── Hook JWT ────────────────────────────────────────────────────────────────────
select is(
  public.custom_access_token_hook(jsonb_build_object('user_id', tests.get_uid('mod'), 'claims', '{"app_metadata":{"provider":"phone"}}'::jsonb))
    #>> '{claims,app_metadata,role}',
  'moderator', 'hook: ghi role vào app_metadata');
select is(
  public.custom_access_token_hook(jsonb_build_object('user_id', tests.get_uid('user_b'), 'claims', '{"app_metadata":{"provider":"phone"}}'::jsonb))
    #>> '{claims,app_metadata,provider}',
  'phone', 'hook: giữ nguyên app_metadata cũ');

select * from finish();
rollback;
