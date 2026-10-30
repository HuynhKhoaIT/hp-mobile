-- Kiểm tra nền: extension, helper, quyền mặc định, và helper test hoạt động.
begin;
\ir _helpers.psql
select plan(18);

-- Extensions
select has_extension('postgis', 'postgis đã cài');
select has_extension('pg_trgm', 'pg_trgm đã cài');
select has_extension('unaccent', 'unaccent đã cài');
select has_extension('pg_cron', 'pg_cron đã cài');
select has_extension('pg_net', 'pg_net đã cài');

-- slugify: phải khớp packages/shared/src/slug.test.ts (cùng bộ ví dụ)
select is(public.slugify('Xe Wave 2019 còn đẹp'), 'xe-wave-2019-con-dep', 'slug: dấu + số');
select is(public.slugify('Phòng trọ gần KCN Dung Quất'), 'phong-tro-gan-kcn-dung-quat', 'slug: chữ hoa + dấu');
select is(public.slugify('Đồ bảo hộ – giày, mũ!!'), 'do-bao-ho-giay-mu', 'slug: đ + ký tự đặc biệt');
select is(public.slugify('  --Tìm   việc   ca đêm--  '), 'tim-viec-ca-dem', 'slug: khoảng trắng + gạch thừa');
select is(public.slugify('二手手机'), 'tin', 'slug: không còn ký tự latin → "tin"');
select is(public.slugify('Ưu đãi ở ghép Ơn trời'), 'uu-dai-o-ghep-on-troi', 'slug: ư ơ ă');
select is(public.slugify(repeat('a', 79) || ' b'), repeat('a', 79), 'slug: cắt 80 không để gạch cuối');

-- short id
select matches(public.gen_short_id(), '^[0-9a-z]{6}$', 'gen_short_id: 6 ký tự base36');

-- Quyền mặc định: bảng mới tạo bởi postgres KHÔNG tự cấp cho anon / authenticated
create table public._grant_probe (id int);
select ok(not has_table_privilege('anon', 'public._grant_probe', 'select'), 'bảng mới: anon không có select mặc định');
select ok(not has_table_privilege('authenticated', 'public._grant_probe', 'insert'), 'bảng mới: authenticated không có insert mặc định');
create function public._fn_probe() returns int language sql as 'select 1';
select ok(not has_function_privilege('anon', 'public._fn_probe()', 'execute'), 'function mới: anon không có execute mặc định');

-- Helper không cho client gọi
select ok(not has_function_privilege('authenticated', 'public.slugify(text)', 'execute'), 'slugify: client không gọi được');

-- Helper test
select tests.create_user('user_a');
select tests.authenticate_as('user_a');
select is(auth.uid(), tests.get_uid('user_a'), 'tests.authenticate_as đặt auth.uid()');
select tests.clear_auth();

select * from finish();
rollback;
