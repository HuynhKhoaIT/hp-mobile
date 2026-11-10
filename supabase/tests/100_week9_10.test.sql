-- Tuần 9 (20261104090000_lost_found_home_feed) + tuần 10 (20261104100000_badges_account_admin).
-- Vai trò: anon, người mất đồ (loser), người nhặt (finder), người ngoài (outsider), bị cấm (bad), moderator (mod), admin.
begin;
\ir _helpers.psql
select plan(59);

select tests.create_user('loser');
select tests.create_user('finder');
select tests.create_user('outsider');
select tests.create_user('bad');
select tests.ban_user('bad');
select tests.create_user('mod', 'moderator');
select tests.create_user('boss', 'admin');
update public.profiles set site = 'hoa_phat_dung_quat' where id in (tests.get_uid('loser'), tests.get_uid('finder'), tests.get_uid('outsider'));

create temp table t_l (name text primary key, id uuid);
grant all on t_l to authenticated, anon;

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select ok((select count(*) from public.home_feed('hoa_phat_dung_quat', 10)) > 0, 'anon: home_feed có tin');
select ok((select count(*) from public.search_listings(p_max_distance_m => 1000, p_limit => 50))
          <= (select count(*) from public.search_listings(p_limit => 50)), 'anon: lọc khoảng cách tới khu không tăng số tin');
select ok(not exists (select 1 from public.search_listings(p_max_distance_m => 1000, p_limit => 50)
                      where distance_to_site_m is null or distance_to_site_m > 1000), 'anon: mọi tin trả về cách khu ≤ 1 km');
select throws_ok($$ select count(*) from public.lost_found_matches $$, '42501', null, 'anon: không đọc lost_found_matches');
select throws_ok($$ select public.request_badge_tx('worker', 'x') $$, '42501', null, 'anon: không xin huy hiệu');
select throws_ok($$ select public.delete_my_account() $$, '42501', null, 'anon: không gọi delete_my_account');
select throws_ok($$ select public.admin_stats() $$, '42501', null, 'anon: không gọi admin_stats');

-- ── khớp đồ thất lạc (tạo tin bằng postgres như tin đã duyệt) ─────────────────────
reset role;
with x as (
  insert into public.listings (owner_id, category, title, status, site, location, attributes)
  values (tests.get_uid('loser'), 'lost', 'Mất ví da nâu zxqw', 'active', 'hoa_phat_dung_quat',
          extensions.st_setsrid(extensions.st_makepoint(108.8220, 15.3850), 4326)::extensions.geography,
          jsonb_build_object('item_type', 'wallet', 'lost_at', (now() - interval '1 day')::text))
  returning id)
insert into t_l select 'lost', id from x;
select is((select count(*)::int from public.lost_found_matches where lost_id = (select id from t_l where name = 'lost')), 0,
  'khớp: chưa có tin nhặt được thì chưa khớp');
with x as (
  insert into public.listings (owner_id, category, title, status, site, location, attributes)
  values (tests.get_uid('finder'), 'found', 'Nhặt được ví zxqw', 'active', 'hoa_phat_dung_quat',
          extensions.st_setsrid(extensions.st_makepoint(108.8300, 15.3880), 4326)::extensions.geography,
          jsonb_build_object('item_type', 'wallet', 'lost_at', now()::text))
  returning id)
insert into t_l select 'found', id from x;
with x as (
  insert into public.listings (owner_id, category, title, status, site, location, attributes)
  values (tests.get_uid('outsider'), 'found', 'Nhặt được chìa khoá zxqw', 'active', 'hoa_phat_dung_quat',
          extensions.st_setsrid(extensions.st_makepoint(108.8221, 15.3851), 4326)::extensions.geography,
          jsonb_build_object('item_type', 'keys', 'lost_at', now()::text))
  returning id)
insert into t_l select 'keys', id from x;
with x as (
  insert into public.listings (owner_id, category, title, status, site, location, attributes)
  values (tests.get_uid('outsider'), 'found', 'Nhặt ví ở Đà Nẵng zxqw', 'active', 'hoa_phat_dung_quat',
          extensions.st_setsrid(extensions.st_makepoint(108.17, 16.06), 4326)::extensions.geography,
          jsonb_build_object('item_type', 'wallet', 'lost_at', now()::text))
  returning id)
insert into t_l select 'far', id from x;
select results_eq($$ select found_id from public.lost_found_matches where lost_id = (select id from t_l where name = 'lost') $$,
  $$ select id from t_l where name = 'found' $$, 'khớp: cùng loại đồ, ≤ 2 ngày, < 2 km (không khớp chìa khoá / ví ở xa)');
select is((select count(*)::int from public.notifications where type = 'lost_found_match'
           and user_id in (tests.get_uid('loser'), tests.get_uid('finder'))), 2, 'khớp: báo cả người mất và người nhặt');
select is((select body_key from public.notifications where type = 'lost_found_match' and user_id = tests.get_uid('loser')),
  'lost_found_match.body_found', 'khớp: người mất nhận "có người nhặt được"');
update public.listings set description = 'Ví có thẻ nhân viên' where id = (select id from t_l where name = 'found');
select is((select count(*)::int from public.notifications where type = 'lost_found_match' and user_id = tests.get_uid('loser')), 1,
  'khớp: sửa mô tả không báo lại');

select tests.authenticate_as('loser');
select results_eq($$ select id from public.list_lost_found_matches((select id from t_l where name = 'lost')) $$,
  $$ select id from t_l where name = 'found' $$, 'chủ tin mất: xem tin khớp');
select tests.authenticate_as('outsider');
select throws_ok(format($$ select public.mark_listing_returned('%s') $$, (select id from t_l where name = 'lost')),
  'P0001', 'not_found', 'người ngoài: không đánh dấu tin người khác đã trả');
select is((select count(*)::int from public.lost_found_matches where lost_id = (select id from t_l where name = 'lost')), 0,
  'người ngoài: không thấy cặp khớp của người khác');

select tests.authenticate_as('finder');
select lives_ok(format($$ select public.mark_listing_returned('%s') $$, (select id from t_l where name = 'found')),
  'chủ tin: đánh dấu đã trả lại');
reset role;
select results_eq($$ select status::text, (attributes ->> 'returned')::boolean from public.listings where id = (select id from t_l where name = 'found') $$,
  $$ values ('closed'::text, true) $$, 'đã trả lại → returned + đóng tin');

-- ── trọ ≥ 3 ảnh ──
select tests.authenticate_as('outsider');
select throws_ok(format($$ insert into public.listings (owner_id, category, title, price, images) values ('%s', 'room_rent', 'Phòng 2 ảnh zxqw', 1500000,
                        array['%s/r1/0.webp', '%s/r1/1.webp']) $$, tests.get_uid('outsider'), tests.get_uid('outsider'), tests.get_uid('outsider')),
  'P0001', 'images_min', 'trọ: đăng công khai cần ≥ 3 ảnh');
select lives_ok(format($$ insert into public.listings (owner_id, category, title, price, status) values ('%s', 'room_rent', 'Nháp phòng zxqw', 1500000, 'draft') $$,
                       tests.get_uid('outsider')), 'trọ: nháp chưa cần ảnh');

-- ── home_feed ───────────────────────────────────────────────────────────────────
select tests.authenticate_as('loser');
select is((select site from public.home_feed(null, 1)), 'hoa_phat_dung_quat', 'home_feed: khu trong hồ sơ lên trước');
select is((select count(*)::int from public.home_feed(null, 50) where owner_id = tests.get_uid('loser')), 0,
  'home_feed: không gợi ý tin của chính mình');

-- ── huy hiệu ────────────────────────────────────────────────────────────────────
select tests.authenticate_as('finder');
select lives_ok(format($$ insert into storage.objects (bucket_id, name) values ('verification', '%s/worker/1793700000000.webp') $$,
                       tests.get_uid('finder')), 'user: upload giấy tờ vào thư mục mình');
select throws_ok(format($$ insert into storage.objects (bucket_id, name) values ('verification', '%s/worker/1793700000000.webp') $$,
                        tests.get_uid('loser')), '42501', null, 'user: không upload vào thư mục người khác');
select throws_ok($$ select public.request_badge_tx('worker', 'abc.webp') $$, 'P0001', 'invalid_input', 'user: path sai');
select throws_ok(format($$ select public.request_badge_tx('worker', '%s/worker/1793700000001.webp') $$, tests.get_uid('finder')),
  'P0001', 'document_missing', 'user: chưa upload thì không xin được');
select lives_ok(format($$ select public.request_badge_tx('worker', '%s/worker/1793700000000.webp') $$, tests.get_uid('finder')),
  'user: xin huy hiệu công nhân');
select throws_ok(format($$ select public.request_badge_tx('worker', '%s/worker/1793700000000.webp') $$, tests.get_uid('finder')),
  'P0001', 'already_requested', 'user: không xin trùng khi đang chờ');
update public.badge_requests set status = 'approved' where user_id = tests.get_uid('finder');
select is((select status from public.badge_requests where user_id = tests.get_uid('finder')), 'pending', 'user: không tự duyệt');
select tests.authenticate_as('outsider');
select is((select count(*)::int from storage.objects where bucket_id = 'verification'), 0, 'người ngoài: không thấy giấy tờ người khác');
select is((select count(*)::int from public.badge_requests), 0, 'người ngoài: không thấy yêu cầu người khác');
select tests.authenticate_as('bad');
select throws_ok(format($$ select public.request_badge_tx('worker', '%s/worker/1793700000000.webp') $$, tests.get_uid('bad')),
  'P0001', 'banned', 'bị cấm: không xin huy hiệu');
select tests.authenticate_as('mod');
select is((select count(*)::int from storage.objects where bucket_id = 'verification'
           and name like tests.get_uid('finder')::text || '/%'), 1, 'moderator: đọc giấy tờ để duyệt');
select lives_ok($$ update public.badge_requests set status = 'approved' where user_id = tests.get_uid('finder') $$,
  'moderator: duyệt huy hiệu');
reset role;
select ok((select 'worker' = any (badges) from public.profiles where id = tests.get_uid('finder')), 'duyệt → hồ sơ có huy hiệu');
select is((select count(*)::int from public.audit_log where action = 'badge.approve' and actor_id = tests.get_uid('mod')), 1,
  'duyệt huy hiệu ghi audit');
select is((select title_key from public.notifications where user_id = tests.get_uid('finder') and type = 'system'),
  'badge_approved.title', 'duyệt huy hiệu báo người xin');
select tests.authenticate_as('finder');
select throws_ok(format($$ select public.request_badge_tx('worker', '%s/worker/1793700000000.webp') $$, tests.get_uid('finder')),
  'P0001', 'badge_owned', 'user: đã có huy hiệu thì không xin lại');

-- ── bản dịch ────────────────────────────────────────────────────────────────────
reset role;
insert into public.listing_translations (listing_id, lang, title, description)
select id, 'en', 'Lost brown wallet', null from t_l where name = 'lost';
update public.listings set title = 'Mất ví da màu nâu zxqw' where id = (select id from t_l where name = 'lost');
select is((select count(*)::int from public.listing_translations where listing_id = (select id from t_l where name = 'lost')), 0,
  'đổi tiêu đề → xoá bản dịch cũ');

-- ── quản trị ────────────────────────────────────────────────────────────────────
select tests.authenticate_as('outsider');
select throws_ok($$ select public.admin_stats() $$, '42501', null, 'user: không xem số liệu admin');
select throws_ok(format($$ select public.staff_set_listing_status('%s', 'closed') $$, (select id from t_l where name = 'found')),
  '42501', null, 'user: không ẩn tin người khác');
select tests.authenticate_as('mod');
select ok((select (public.admin_stats() ->> 'users_total')::int > 0), 'moderator: xem số liệu');
select ok((select public.admin_stats() ? 'badges_pending'), 'moderator: số liệu có hàng chờ huy hiệu');
select lives_ok(format($$ select public.staff_set_listing_status('%s', 'closed', 'Tin trùng') $$, (select id from t_l where name = 'keys')),
  'moderator: ẩn tin');
select throws_ok($$ select public.export_audit_log() $$, '42501', null, 'moderator: không xuất audit');
select lives_ok($$ update public.profiles set banned_until = now() + interval '3 days' where id = tests.get_uid('outsider') $$,
  'moderator: khoá tạm 3 ngày');
reset role;
select is((select status::text from public.listings where id = (select id from t_l where name = 'keys')), 'closed', 'tin đã ẩn');
select results_eq($$ select action from public.audit_log where actor_id = tests.get_uid('mod') and action in ('listing.status', 'user.suspend') order by action $$,
  $$ values ('listing.status'::text), ('user.suspend'::text) $$, 'thao tác staff ghi audit');
select tests.authenticate_as('boss');
select lives_ok($$ update public.profiles set role = 'moderator' where id = tests.get_uid('loser') $$, 'admin: đổi vai trò');
select ok((select count(*) from public.export_audit_log(now() - interval '1 hour', null, 'user.')) >= 2, 'admin: xuất audit theo tiền tố');
reset role;
select is((select count(*)::int from public.audit_log where actor_id = tests.get_uid('boss') and action in ('user.role', 'audit.export')), 2,
  'đổi vai trò + xuất audit đều ghi audit');
update public.profiles set role = 'user' where id = tests.get_uid('loser');

-- ── xoá tài khoản ───────────────────────────────────────────────────────────────
with x as (
  insert into public.groups (host_id, kind, sub_kind, title, starts_at, seats_total, origin_text, requires_approval)
  values (tests.get_uid('loser'), 'sport', 'football', 'Kèo của người sắp xoá', now() + interval '2 days', 4, 'Sân A', false)
  returning id)
insert into t_l select 'group', id from x;
select tests.authenticate_as('loser');
select lives_ok($$ select public.delete_my_account() $$, 'user: xoá tài khoản');
reset role;
select ok((select deleted_at is not null from public.profiles where id = tests.get_uid('loser')), 'xoá: profiles.deleted_at đã đặt');
select is((select status::text from public.groups where id = (select id from t_l where name = 'group')), 'cancelled', 'xoá: huỷ nhóm mình tạo');
select tests.clear_auth();
select is((select count(*)::int from public.public_listings where owner_id = tests.get_uid('loser')), 0, 'xoá: tin biến khỏi trang công khai');
select is((select count(*)::int from public.public_profiles where id = tests.get_uid('loser')), 0, 'xoá: hồ sơ công khai ẩn');
select tests.authenticate_as('loser');
select throws_ok($$ select public.request_badge_tx('worker', 'x') $$, 'P0001', 'banned', 'xoá: tài khoản đã xoá bị coi như bị cấm');
reset role;
select is((select count(*)::int from public.audit_log where action = 'account.delete' and target_id = tests.get_uid('loser')::text), 1,
  'xoá: ghi audit');

-- ── xoá cứng (purge-files): audit giữ lại, ẩn danh người thực hiện; sửa nội dung audit vẫn bị chặn ──
delete from auth.users where id = tests.get_uid('loser');
select is((select count(*)::int from public.audit_log where action = 'account.delete' and actor_id is null
           and target_id = tests.get_uid('loser')::text), 1, 'xoá cứng: audit còn, actor_id → null');
select throws_ok($$ update public.audit_log set action = 'x.y' where action = 'account.delete' $$, '42501', null,
  'audit_log: vẫn không sửa được nội dung');

select * from finish();
rollback;
