-- Tuần 8: venues (20261103090000_venues), nhắc giờ / hết hạn / đánh giá / nhóm của tôi / chat nhóm
-- (20261103100000_group_lifecycle_chat).
-- Vai trò: anon, chủ nhóm (host), thành viên (member, member2), người ngoài (outsider), bị cấm (bad), moderator (mod).
begin;
\ir _helpers.psql
select plan(53);

select tests.create_user('host');
select tests.create_user('member');
select tests.create_user('member2');
select tests.create_user('outsider');
select tests.create_user('bad');
select tests.ban_user('bad');
select tests.create_user('mod', 'moderator');
update public.profiles set site = 'hoa_phat_dung_quat' where id in (tests.get_uid('host'), tests.get_uid('outsider'));

create temp table t_g (name text primary key, id uuid);
grant all on t_g to authenticated, anon;

-- Sân dựng sẵn (postgres): A đã duyệt (bóng đá), B chờ duyệt.
with x as (
  insert into public.venues (name, sports, site, location, status, created_by)
  values ('Sân test A', array['football'], 'hoa_phat_dung_quat',
          extensions.st_setsrid(extensions.st_makepoint(108.83337, 15.37771), 4326)::extensions.geography, 'approved',
          tests.get_uid('host'))
  returning id)
insert into t_g select 'venue_a', id from x;
with x as (
  insert into public.venues (name, sports, site, status, created_by)
  values ('Sân test B', array['badminton'], 'hoa_phat_dung_quat', 'pending', tests.get_uid('member'))
  returning id)
insert into t_g select 'venue_b', id from x;

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select is((select count(*)::int from public.venues where name like 'Sân test %'), 1, 'anon: chỉ thấy sân đã duyệt');
select throws_ok($$ insert into public.venues (name, sports) values ('Sân anon', array['football']) $$,
  '42501', null, 'anon: không góp sân');
select ok(exists (select 1 from public.search_venues('football', null, 'san test') where name = 'Sân test A'),
  'anon: search_venues tìm theo chữ không dấu');
select throws_ok($$ select count(*) from public.my_groups $$, '42501', null, 'anon: không đọc my_groups');
select throws_ok($$ select public.rate_group(gen_random_uuid(), 5) $$, '42501', null, 'anon: không gọi rate_group');
select throws_ok($$ select public.remind_groups() $$, '42501', null, 'anon: không gọi remind_groups');

-- ── user (outsider) góp sân ─────────────────────────────────────────────────────
select tests.authenticate_as('outsider');
select lives_ok($$ insert into public.venues (name, sports, address_text) values ('  Sân góp của tôi ', array['pickleball', 'pickleball'], 'Gần chợ') $$,
  'user: góp sân');
select results_eq($$ select status, site, sports, name from public.venues where created_by = tests.get_uid('outsider') $$,
  $$ values ('pending'::text, 'hoa_phat_dung_quat'::text, array['pickleball']::text[], 'Sân góp của tôi'::text) $$,
  'user: sân góp luôn pending, khu theo hồ sơ, môn bỏ trùng, tên cắt khoảng trắng');
select is((select count(*)::int from public.venues where status = 'pending'), 1, 'user: thấy sân chờ duyệt của mình, không thấy của người khác');
select throws_ok($$ insert into public.venues (name, sports, status) values ('Tự duyệt', array['football'], 'approved') $$,
  '42501', null, 'user: không tự đặt trạng thái');
select throws_ok(format($$ insert into public.venues (name, sports, created_by) values ('Góp hộ', array['football'], '%s') $$, tests.get_uid('member')),
  '42501', null, 'user: không góp thay người khác');
update public.venues set status = 'approved' where created_by = tests.get_uid('outsider');
select is((select status from public.venues where created_by = tests.get_uid('outsider')), 'pending', 'user: không tự duyệt sân');

-- ── bị cấm ──────────────────────────────────────────────────────────────────────
select tests.authenticate_as('bad');
select throws_ok($$ insert into public.venues (name, sports) values ('Sân cấm', array['football']) $$,
  '42501', null, 'bị cấm: không góp sân');
select throws_ok($$ select public.rate_group(gen_random_uuid(), 5) $$, 'P0001', 'banned', 'bị cấm: không đánh giá');

-- ── host tạo kèo theo sân ───────────────────────────────────────────────────────
select tests.authenticate_as('host');
select throws_ok(format($$ insert into public.groups (kind, sub_kind, title, starts_at, seats_total, origin_text, venue_id)
                    values ('sport', 'badminton', 'Cầu lông sai sân', now() + interval '1 day', 3, 'Sân test A', '%s') $$,
                    (select id from t_g where name = 'venue_a')),
  'P0001', 'invalid_venue', 'host: môn phải có ở sân');
select throws_ok(format($$ insert into public.groups (kind, sub_kind, title, starts_at, seats_total, origin_text, venue_id)
                    values ('sport', 'badminton', 'Sân chưa duyệt', now() + interval '1 day', 3, 'Sân test B', '%s') $$,
                    (select id from t_g where name = 'venue_b')),
  'P0001', 'invalid_venue', 'host: sân chưa duyệt không chọn được');
select throws_ok(format($$ insert into public.groups (kind, sub_kind, title, starts_at, seats_total, origin_text, destination_text, venue_id)
                    values ('ride', 'car_owner', 'Xe có sân', now() + interval '1 day', 3, 'Cổng', 'Đà Nẵng', '%s') $$,
                    (select id from t_g where name = 'venue_a')),
  'P0001', 'invalid_venue', 'host: ghép xe không gắn sân');
with x as (
  insert into public.groups (kind, sub_kind, title, starts_at, seats_total, origin_text, venue_id, requires_approval)
  values ('sport', 'football', 'Đá bóng sân test', now() + interval '1 day', 6, 'Sân test A - sân 2',
          (select id from t_g where name = 'venue_a'), false)
  returning id)
insert into t_g select 'match', id from x;
select results_eq($$ select venue_name, origin_lat, origin_lng from public.public_groups where id = (select id from t_g where name = 'match') $$,
  $$ values ('Sân test A'::text, 15.378::double precision, 108.834::double precision) $$,
  'host: kèo lấy vị trí sân (làm tròn ~300 m) + tên sân');

-- thành viên vào (postgres, như join_group_tx)
reset role;
insert into t_g select 'match_chat', conversation_id from public.groups where id = (select id from t_g where name = 'match');
insert into public.group_members (group_id, user_id, status)
select id, tests.get_uid(u), 'accepted' from t_g, unnest(array['member', 'member2']) u where name = 'match';
with x as (
  insert into public.groups (host_id, kind, sub_kind, title, starts_at, seats_total, origin_text, requires_approval)
  values (tests.get_uid('host'), 'sport', 'football', 'Kèo tuần sau', now() + interval '7 days', 6, 'Sân khác', false)
  returning id)
insert into t_g select 'future', id from x;
insert into public.group_members (group_id, user_id, status)
select id, tests.get_uid('member'), 'accepted' from t_g where name = 'future';

-- ── nhắc giờ ────────────────────────────────────────────────────────────────────
update public.groups set starts_at = now() + interval '30 minutes' where id = (select id from t_g where name = 'match');
select ok(public.remind_groups() >= 3, 'cron: remind_groups tạo thông báo');
select is((select count(*)::int from public.notifications
           where type = 'group_reminder' and data -> 'params' ->> 'id' = (select id from t_g where name = 'match')::text),
  3, 'cron: nhắc chủ nhóm + 2 thành viên');
select is((select body_key from public.notifications
           where type = 'group_reminder' and user_id = tests.get_uid('member') limit 1),
  'group_reminder.body_sport', 'cron: khoá nhắc theo loại nhóm');
select public.remind_groups();
select is((select count(*)::int from public.notifications
           where type = 'group_reminder' and data -> 'params' ->> 'id' = (select id from t_g where name = 'match')::text),
  3, 'cron: không nhắc lại lần hai');
select is((select count(*)::int from public.notifications
           where type = 'group_reminder' and data -> 'params' ->> 'id' = (select id from t_g where name = 'future')::text),
  0, 'cron: nhóm còn xa chưa nhắc');
select tests.authenticate_as('host');
update public.groups set starts_at = now() + interval '50 minutes' where id = (select id from t_g where name = 'match');
reset role;
select is((select reminded_at from public.groups where id = (select id from t_g where name = 'match')), null,
  'host đổi giờ → reminded_at reset');

-- ── rate_group trước giờ ────────────────────────────────────────────────────────
select tests.authenticate_as('member');
select throws_ok(format($$ select public.rate_group('%s', 5) $$, (select id from t_g where name = 'future')),
  'P0001', 'group_not_finished', 'member: chưa diễn ra thì chưa đánh giá');

-- ── hết hạn ─────────────────────────────────────────────────────────────────────
reset role;
update public.groups set starts_at = now() - interval '4 hours' where id = (select id from t_g where name = 'match');
with x as (
  update public.listings set expires_at = now() + interval '2 days'
  where id = (select id from public.listings where status = 'active' and deleted_at is null order by created_at, id limit 1)
  returning id)
insert into t_g select 'expiring', id from x;
with x as (
  update public.listings set expires_at = now() - interval '1 hour'
  where id = (select id from public.listings where status = 'active' and deleted_at is null order by created_at, id offset 1 limit 1)
  returning id)
insert into t_g select 'expired', id from x;
select lives_ok($$ select public.expire_content() $$, 'cron: expire_content chạy');
select is((select status::text from public.groups where id = (select id from t_g where name = 'match')), 'completed',
  'cron: nhóm qua giờ 3h → completed');
select is((select count(*)::int from public.notifications
           where type = 'group_completed' and data -> 'params' ->> 'id' = (select id from t_g where name = 'match')::text),
  2, 'cron: mời 2 thành viên đánh giá (không gửi chủ nhóm)');
select is((select status::text from public.listings where id = (select id from t_g where name = 'expired')), 'expired',
  'cron: tin quá hạn → expired');
select is((select count(*)::int from public.notifications
           where type = 'listing_expiring' and data -> 'params' ->> 'id' = (select id from t_g where name = 'expiring')::text),
  1, 'cron: nhắc gia hạn tin còn ≤ 3 ngày');
select public.expire_content();
select is((select count(*)::int from public.notifications
           where type = 'listing_expiring' and data -> 'params' ->> 'id' = (select id from t_g where name = 'expiring')::text),
  1, 'cron: không nhắc gia hạn hai lần cùng mốc');

-- ── rate_group ──────────────────────────────────────────────────────────────────
select tests.authenticate_as('outsider');
select throws_ok(format($$ select public.rate_group('%s', 5) $$, (select id from t_g where name = 'match')),
  'P0001', 'forbidden', 'outsider: không phải thành viên thì không đánh giá');
select tests.authenticate_as('member2');
select throws_ok(format($$ select public.rate_group('%s', 6) $$, (select id from t_g where name = 'match')),
  'P0001', 'invalid_input', 'member: điểm 1–5');
select throws_ok(format($$ select public.rate_group('%s', 4, 'gọi mình 0912 345 678') $$, (select id from t_g where name = 'match')),
  'P0001', 'message_has_phone', 'member: nhận xét không chứa SĐT');
select tests.authenticate_as('member');
select lives_ok(format($$ select public.rate_group('%s', 4, ' Chủ kèo vui ') $$, (select id from t_g where name = 'match')),
  'member: đánh giá chủ nhóm');
select throws_ok(format($$ select public.rate_group('%s', 5) $$, (select id from t_g where name = 'match')),
  'P0001', 'already_rated', 'member: mỗi nhóm đánh giá một lần');
select results_eq($$ select rating_count, rating_avg from public.public_profiles where id = tests.get_uid('host') $$,
  $$ values (1, 4.00::numeric) $$, 'điểm chủ nhóm cập nhật');

-- ── my_groups ───────────────────────────────────────────────────────────────────
select results_eq($$ select my_role, is_upcoming, my_rating::int from public.my_groups where id = (select id from t_g where name = 'match') $$,
  $$ values ('accepted'::text, false, 4) $$, 'member: nhóm đã qua có điểm mình chấm');
select is((select my_role from public.my_groups where id = (select id from t_g where name = 'future')), 'accepted',
  'member: nhóm sắp tới');
select tests.authenticate_as('host');
select is((select count(*)::int from public.my_groups where my_role = 'host' and id in (select id from t_g)), 2,
  'host: thấy 2 nhóm mình tạo');
select tests.authenticate_as('outsider');
select is((select count(*)::int from public.my_groups where id in (select id from t_g)), 0, 'outsider: không thấy nhóm người khác');

-- ── chat nhóm ───────────────────────────────────────────────────────────────────
select tests.authenticate_as('member');
select is((select count(*)::int from public.list_conversations(50) where context_id = (select id from t_g where name = 'match')), 0,
  'member: chat nhóm chưa có tin thì chưa vào hộp thư');
select results_eq($$ select kind, group_title, member_count from public.list_conversations(1, null, (select id from t_g where name = 'match_chat')) $$,
  $$ values ('group'::text, 'Đá bóng sân test'::text, 3) $$, 'member: mở chat nhóm theo id (header) có tên nhóm + số thành viên');
select is((select count(*)::int from public.list_conversation_members((select id from t_g where name = 'match_chat'))),
  3, 'member: thấy 3 người trong chat nhóm');
select lives_ok($$ insert into public.messages (conversation_id, sender_id, body)
                   values ((select id from t_g where name = 'match_chat'), tests.get_uid('member'), 'Mai mình mang bóng') $$,
  'member: gửi tin vào chat nhóm');
select results_eq($$ select kind, last_sender_name from public.list_conversations(50) where context_id = (select id from t_g where name = 'match') $$,
  $$ values ('group'::text, (select display_name from public.public_profiles where id = tests.get_uid('member'))) $$,
  'member: có tin rồi thì chat nhóm vào hộp thư, kèm tên người gửi cuối');
reset role;
select results_eq($$ select title_key, body_key, params ->> 'title' from public.notifications
                     where type = 'new_message' and user_id = tests.get_uid('host') $$,
  $$ values ('new_message.group_title'::text, 'new_message.group_body'::text, 'Đá bóng sân test'::text) $$,
  'thông báo chat nhóm có tên nhóm');
select tests.authenticate_as('outsider');
select is((select count(*)::int from public.list_conversation_members((select id from t_g where name = 'match_chat'))), 0,
  'outsider: không xem được thành viên chat nhóm');
select throws_ok(format($$ insert into public.messages (conversation_id, sender_id, body) values ('%s', '%s', 'xin chào') $$,
                        (select id from t_g where name = 'match_chat'), tests.get_uid('outsider')),
  '42501', null, 'outsider: không gửi tin vào chat nhóm');

-- ── moderator ───────────────────────────────────────────────────────────────────
select tests.authenticate_as('mod');
select is((select count(*)::int from public.venues where status = 'pending' and name in ('Sân test B', 'Sân góp của tôi')), 2,
  'moderator: thấy mọi sân chờ duyệt');
select lives_ok($$ update public.venues set status = 'approved' where name = 'Sân test B' $$, 'moderator: duyệt sân');
reset role;
select results_eq($$ select reviewed_by, reviewed_at is not null from public.venues where name = 'Sân test B' $$,
  $$ values (tests.get_uid('mod'), true) $$, 'moderator: ghi người duyệt');
select is((select count(*)::int from public.audit_log
           where action = 'venue.approve' and target_id = (select id from t_g where name = 'venue_b')::text), 1,
  'moderator: duyệt sân ghi audit_log');

select * from finish();
rollback;
