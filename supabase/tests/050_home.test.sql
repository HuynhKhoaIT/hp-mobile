-- banners (RLS, khung thời gian, audit) + bucket banners + my_listing_stats.
begin;
\ir _helpers.psql
select plan(14);

select tests.create_user('owner');
select tests.create_user('other');
select tests.create_user('bad');
select tests.ban_user('bad');
select tests.create_user('mod', 'moderator');
select tests.create_user('boss', 'admin');

insert into public.banners (id, placement, locale, title, is_active, starts_at, ends_at) values
  ('c0000000-0000-4000-8000-000000000001', 'app_home', 'vi', 'Đang chạy zxqb', true, now() - interval '1 day', now() + interval '1 day'),
  ('c0000000-0000-4000-8000-000000000002', 'app_home', 'vi', 'Chưa tới giờ zxqb', true, now() + interval '1 day', null),
  ('c0000000-0000-4000-8000-000000000003', 'app_home', 'vi', 'Đã tắt zxqb', false, null, null),
  ('c0000000-0000-4000-8000-000000000004', 'web_home', null, 'Mọi ngôn ngữ zxqb', true, null, now() - interval '1 hour');

-- ── banners ─────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select is((select count(*)::int from public.banners where title like '%zxqb'), 1, 'anon: chỉ thấy banner đang hiệu lực');
select throws_ok($$ insert into public.banners (placement, title) values ('app_home', 'x') $$, '42501', null, 'anon: không thêm banner');
select tests.authenticate_as('mod');
select is((select count(*)::int from public.banners where title like '%zxqb'), 1, 'moderator: cũng chỉ thấy banner đang hiệu lực');
select throws_ok($$ insert into public.banners (placement, title) values ('app_home', 'x') $$, '42501', null, 'moderator: không thêm banner');
select tests.authenticate_as('bad');
select is((select count(*)::int from public.banners where title like '%zxqb'), 1, 'bị cấm: vẫn đọc banner công khai');
select tests.authenticate_as('boss');
select is((select count(*)::int from public.banners where title like '%zxqb'), 4, 'admin: thấy mọi banner (kể cả tắt / hết hạn)');
select lives_ok($$ insert into public.banners (placement, title, link_url, tone) values ('web_home', 'Admin zxqb', '/tro', 'room') $$,
  'admin: thêm banner');
select throws_ok($$ insert into public.banners (placement, title, link_url) values ('web_home', 'x', 'javascript:alert(1)') $$,
  '23514', null, 'banner: link_url chỉ nhận đường dẫn nội bộ hoặc https');
reset role;
select is((select action from public.audit_log where target_type = 'banner' order by id desc limit 1), 'banner.insert',
  'banner: admin thêm → ghi audit_log');

-- ── bucket banners ──────────────────────────────────────────────────────────────
select tests.authenticate_as('other');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('banners', 'tet.webp') $$, '42501', null,
  'storage banners: user không upload');
select tests.authenticate_as('boss');
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('banners', 'tet.webp') $$, 'storage banners: admin upload');

-- ── my_listing_stats ────────────────────────────────────────────────────────────
reset role;
insert into public.listings (owner_id, category, title, status, view_count, expires_at) values
  (tests.get_uid('owner'), 'pass_home', 'A zxqb', 'active', 10, now() + interval '20 days'),
  (tests.get_uid('owner'), 'pass_home', 'B zxqb', 'active', 5, now() + interval '2 days'),
  (tests.get_uid('owner'), 'pass_home', 'C zxqb', 'pending_review', 0, null),
  (tests.get_uid('owner'), 'pass_home', 'D zxqb', 'draft', 0, null),
  (tests.get_uid('other'), 'pass_home', 'E zxqb', 'active', 99, now() + interval '20 days');
select tests.authenticate_as('owner');
select is((select row(active, pending, rejected, drafts, expiring_soon, total_views)::text from public.my_listing_stats()),
  '(2,1,0,1,1,15)', 'my_listing_stats: đếm đúng tin của mình theo trạng thái + tổng lượt xem');
select tests.authenticate_as('mod');
select is((select active from public.my_listing_stats()), 0, 'my_listing_stats: staff chỉ đếm tin của chính mình');
select tests.clear_auth();
select throws_ok($$ select * from public.my_listing_stats() $$, '42501', null, 'my_listing_stats: khách không gọi được');

select * from finish();
rollback;
