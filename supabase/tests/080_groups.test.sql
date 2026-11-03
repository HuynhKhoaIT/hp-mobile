-- Nhóm ghép (20261102110000_groups).
-- Vai trò: anon, chủ nhóm (host), người tham gia (rider, rider2, rider3), người ngoài (outsider), bị cấm, moderator.
begin;
\ir _helpers.psql
select plan(78);

select tests.create_user('host');
select tests.create_user('rider');
select tests.create_user('rider2');
select tests.create_user('rider3');
select tests.create_user('outsider');
select tests.create_user('bad');
select tests.ban_user('bad');
select tests.create_user('mod', 'moderator');
update public.profiles set site = 'hoa_phat_dung_quat' where id = tests.get_uid('host');

create temp table t_g (name text primary key, id uuid);
grant all on t_g to authenticated, anon;

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select count(*) from public.groups $$, '42501', null, 'anon: không đọc bảng gốc groups');
select throws_ok($$ select count(*) from public.group_members $$, '42501', null, 'anon: không đọc group_members');
select throws_ok($$ insert into public.groups (kind, sub_kind, title, starts_at, seats_total, origin_text, destination_text)
                    values ('ride', 'car_owner', 'Đi Đà Nẵng', now() + interval '1 day', 3, 'Cổng', 'Đà Nẵng') $$,
  '42501', null, 'anon: không tạo nhóm');
select throws_ok($$ select public.join_group_tx('00000000-0000-4000-8000-000000000999') $$, '42501', null, 'anon: không gọi join_group_tx');

-- ── host tạo nhóm ───────────────────────────────────────────────────────────────
select tests.authenticate_as('host');
select throws_ok($$ insert into public.groups (kind, sub_kind, title, starts_at, seats_total, origin_text, destination_text)
                    values ('ride', 'car_owner', 'Đi Đà Nẵng sớm', now() + interval '5 minutes', 3, 'Cổng', 'Đà Nẵng') $$,
  'P0001', 'starts_too_soon', 'host: giờ đi phải sau ít nhất 15 phút');
select throws_ok($$ insert into public.groups (kind, sub_kind, title, starts_at, seats_total, origin_text, destination_text)
                    values ('ride', 'car_owner', 'Đi Đà Nẵng xa', now() + interval '90 days', 3, 'Cổng', 'Đà Nẵng') $$,
  'P0001', 'starts_too_far', 'host: giờ đi tối đa 60 ngày');
select throws_ok($$ insert into public.groups (kind, sub_kind, title, starts_at, seats_total, origin_text, destination_text)
                    values ('ride', 'football', 'Sai loại', now() + interval '1 day', 3, 'Cổng', 'Đà Nẵng') $$,
  '23514', null, 'host: sub_kind phải đúng kind');
select throws_ok($$ insert into public.groups (kind, sub_kind, title, starts_at, seats_total, origin_text)
                    values ('ride', 'car_owner', 'Thiếu điểm đến', now() + interval '1 day', 3, 'Cổng') $$,
  '23514', null, 'host: ghép xe bắt buộc điểm đến');
select throws_ok($$ insert into public.groups (kind, sub_kind, title, starts_at, seats_total, origin_text, destination_text, status)
                    values ('ride', 'car_owner', 'Tự đặt full', now() + interval '1 day', 3, 'Cổng', 'Đà Nẵng', 'full') $$,
  '42501', null, 'host: không tự đặt trạng thái');
select throws_ok($$ insert into public.groups (kind, sub_kind, title, starts_at, seats_total, origin_text, destination_text)
                    values ('ride', 'motorbike', 'Xe máy 3 chỗ', now() + interval '1 day', 3, 'Cổng', 'Đà Nẵng') $$,
  'P0001', 'invalid_input', 'host: xe máy tối đa 2 chỗ');
select throws_ok(format($$ insert into public.groups (host_id, kind, sub_kind, title, starts_at, seats_total, origin_text, destination_text)
                    values ('%s', 'ride', 'car_owner', 'Tạo hộ người khác', now() + interval '1 day', 3, 'Cổng', 'Đà Nẵng') $$, tests.get_uid('rider')),
  '42501', null, 'host: không tạo nhóm thay người khác');

with x as (
  insert into public.groups (kind, sub_kind, title, starts_at, seats_total, fee_per_person, origin_text, destination_text,
                             origin, destination, requires_approval)
  values ('ride', 'car_owner', '  Dung Quất → Đà Nẵng  ', now() + interval '1 day', 2, 150000, 'Cổng chính', 'Đà Nẵng',
          extensions.st_setsrid(extensions.st_makepoint(108.82234, 15.38567), 4326)::extensions.geography,
          extensions.st_setsrid(extensions.st_makepoint(108.17211, 16.05934), 4326)::extensions.geography, true)
  returning id)
insert into t_g select 'approve', id from x;
with x as (
  insert into public.groups (kind, sub_kind, title, starts_at, seats_total, origin_text, destination_text, requires_approval)
  values ('ride', 'bus_pool', 'Xe khách về Quảng Ngãi', now() + interval '2 days', 1, 'Cổng chính', 'Quảng Ngãi', false)
  returning id)
insert into t_g select 'open', id from x;

select is((select title from public.groups where id = (select id from t_g where name = 'approve')), 'Dung Quất → Đà Nẵng',
  'host: tiêu đề được cắt khoảng trắng');
select matches((select slug from public.groups where id = (select id from t_g where name = 'approve')), '^dung-quat-da-nang-[0-9a-z]{6}$',
  'host: slug = tiêu đề không dấu + short_id');
select is((select site from public.groups where id = (select id from t_g where name = 'approve')), 'hoa_phat_dung_quat',
  'host: khu mặc định theo hồ sơ');
select isnt((select conversation_id from public.groups where id = (select id from t_g where name = 'approve')), null,
  'host: chat nhóm tạo cùng nhóm');
select is((select count(*)::int from public.conversation_members cm join public.groups g on g.conversation_id = cm.conversation_id
           where g.id = (select id from t_g where name = 'approve')), 1, 'host: chủ nhóm là member chat nhóm');
select is((select c.kind from public.conversations c join public.groups g on g.conversation_id = c.id
           where g.id = (select id from t_g where name = 'approve')), 'group', 'host: hội thoại kind = group');

-- ── public_groups / search ──────────────────────────────────────────────────────
select tests.clear_auth();
select is((select origin_lat from public.public_groups where id = (select id from t_g where name = 'approve')), 15.387::double precision,
  'anon: điểm đi làm tròn lưới 0.003°');
select is((select host_name from public.public_groups where id = (select id from t_g where name = 'approve')), 'host T.',
  'anon: tên chủ nhóm dạng "An N."');
select is((select seats_left from public.public_groups where id = (select id from t_g where name = 'approve')), 2, 'anon: seats_left');
select ok((select count(*) from public.search_groups('ride') where id in (select id from t_g)) = 2, 'anon: search_groups thấy nhóm mở');
select is((select count(*)::int from public.search_groups('ride', array['bus_pool']) where id in (select id from t_g)), 1,
  'anon: lọc sub_kind');
select is((select count(*)::int from public.search_groups('ride', p_query => 'da nang') where id in (select id from t_g)), 1,
  'anon: tìm không dấu theo điểm đến / tiêu đề');
select is((select count(*)::int from public.search_groups('sport') where id in (select id from t_g)), 0, 'anon: lọc theo kind');
select is((select count(*)::int from public.search_groups('ride', p_dest_lat => 16.06, p_dest_lng => 108.17, p_dest_radius_m => 5000)
           where id in (select id from t_g)), 1, 'anon: lọc bán kính điểm đến');
select is((select count(*)::int from public.search_groups('ride', p_limit => 500)), (select least(count(*), 50)::int from public.search_groups('ride', p_limit => 50)),
  'anon: p_limit kẹp 50');
select is((select count(*)::int from public.search_groups('ride', p_cursor_starts_at => (select starts_at from public.public_groups where id = (select id from t_g where name = 'approve')),
                                                         p_cursor_id => (select id from t_g where name = 'approve'))
           where id = (select id from t_g where name = 'approve')), 0, 'anon: cursor bỏ dòng đã xem');
select is((select id from public.get_group_by_slug('bat-ky-' || (select short_id from public.public_groups where id = (select id from t_g where name = 'approve')))),
  (select id from t_g where name = 'approve'), 'anon: get_group_by_slug theo short_id');

-- ── join: cần duyệt ─────────────────────────────────────────────────────────────
select tests.authenticate_as('host');
select throws_ok(format($$ select public.join_group_tx('%s') $$, (select id from t_g where name = 'approve')),
  'P0001', 'cannot_join_own', 'host: không tham gia nhóm của mình');
select throws_ok($$ insert into public.group_members (group_id, user_id) select id, auth.uid() from t_g where name = 'open' $$,
  '42501', null, 'host: không insert group_members trực tiếp');

select tests.authenticate_as('rider');
select throws_ok(format($$ select public.join_group_tx('%s', 'gọi mình 0912345678 nhé') $$, (select id from t_g where name = 'approve')),
  'P0001', 'message_has_phone', 'rider: lời nhắn có SĐT bị chặn');
select is(public.join_group_tx((select id from t_g where name = 'approve'), 'Cho mình đi với'), 'requested'::public.member_status,
  'rider: nhóm cần duyệt → requested');
select throws_ok(format($$ select public.join_group_tx('%s') $$, (select id from t_g where name = 'approve')),
  'P0001', 'already_joined', 'rider: không xin hai lần');
select is((select status from public.group_members where group_id = (select id from t_g where name = 'approve') and user_id = auth.uid()),
  'requested'::public.member_status, 'rider: đọc được dòng của mình');
select throws_ok(format($$ select public.respond_join_tx('%s', '%s', true) $$, (select id from t_g where name = 'approve'), tests.get_uid('rider')),
  'P0001', 'forbidden', 'rider: không tự duyệt');
select is((select count(*)::int from public.groups where id in (select id from t_g)), 0, 'rider: không đọc bảng gốc nhóm người khác');

select tests.authenticate_as('rider2');
select is(public.join_group_tx((select id from t_g where name = 'approve')), 'requested'::public.member_status, 'rider2: xin tham gia');
select tests.authenticate_as('rider3');
select is(public.join_group_tx((select id from t_g where name = 'approve')), 'requested'::public.member_status, 'rider3: xin tham gia');

select tests.authenticate_as('host');
select is((select count(*)::int from public.notifications where user_id = auth.uid() and type = 'join_request'
           and data -> 'params' ->> 'id' = (select id from t_g where name = 'approve')::text), 3, 'host: 3 thông báo join_request');
select is((select count(*)::int from public.list_group_members((select id from t_g where name = 'approve'))), 3,
  'host: thấy mọi người xin');
select is((select note from public.list_group_members((select id from t_g where name = 'approve')) where user_id = tests.get_uid('rider')),
  'Cho mình đi với', 'host: đọc lời nhắn');
select is(public.respond_join_tx((select id from t_g where name = 'approve'), tests.get_uid('rider'), true), 'accepted'::public.member_status,
  'host: duyệt rider');
select is(public.respond_join_tx((select id from t_g where name = 'approve'), tests.get_uid('rider2'), true), 'accepted'::public.member_status,
  'host: duyệt rider2');
select is((select status from public.groups where id = (select id from t_g where name = 'approve')), 'full'::public.group_status,
  'host: đủ chỗ → full');
select throws_ok(format($$ select public.respond_join_tx('%s', '%s', true) $$, (select id from t_g where name = 'approve'), tests.get_uid('rider3')),
  'P0001', 'group_full', 'host: không duyệt quá số chỗ');
select is(public.respond_join_tx((select id from t_g where name = 'approve'), tests.get_uid('rider3'), false), 'declined'::public.member_status,
  'host: từ chối rider3');
select is((select count(*)::int from public.conversation_members cm join public.groups g on g.conversation_id = cm.conversation_id
           where g.id = (select id from t_g where name = 'approve')), 3, 'host: người được duyệt vào chat nhóm');
select throws_ok(format($$ update public.groups set seats_total = 1 where id = '%s' $$, (select id from t_g where name = 'approve')),
  'P0001', 'seats_below_taken', 'host: không giảm số chỗ dưới số đã nhận');
select throws_ok(format($$ update public.groups set seats_taken = 0 where id = '%s' $$, (select id from t_g where name = 'approve')),
  '42501', null, 'host: không sửa seats_taken');
select lives_ok(format($$ update public.groups set seats_total = 3 where id = '%s' $$, (select id from t_g where name = 'approve')),
  'host: tăng số chỗ');
select is((select status from public.groups where id = (select id from t_g where name = 'approve')), 'open'::public.group_status,
  'host: tăng chỗ → mở lại');

select tests.authenticate_as('rider');
select is((select count(*)::int from public.notifications where user_id = auth.uid() and type = 'join_accepted'), 1,
  'rider: thông báo join_accepted');
select is((select count(*)::int from public.list_group_members((select id from t_g where name = 'approve'))), 2,
  'rider: thành viên thấy nhau (không thấy người bị từ chối)');
select tests.authenticate_as('rider3');
select is((select count(*)::int from public.notifications where user_id = auth.uid() and type = 'join_declined'), 1,
  'rider3: thông báo join_declined');
select throws_ok(format($$ select public.join_group_tx('%s') $$, (select id from t_g where name = 'approve')),
  'P0001', 'join_declined', 'rider3: bị từ chối không xin lại được');
select is((select count(*)::int from public.list_group_members((select id from t_g where name = 'approve'))), 1,
  'rider3: chỉ thấy dòng của mình');

-- ── join: không cần duyệt + full + rời nhóm ─────────────────────────────────────
select tests.authenticate_as('rider');
select is(public.join_group_tx((select id from t_g where name = 'open')), 'accepted'::public.member_status, 'rider: nhóm không duyệt → accepted ngay');
select tests.authenticate_as('rider2');
select throws_ok(format($$ select public.join_group_tx('%s') $$, (select id from t_g where name = 'open')),
  'P0001', 'group_full', 'rider2: nhóm đã full');
select tests.authenticate_as('rider');
select lives_ok(format($$ select public.leave_group('%s') $$, (select id from t_g where name = 'open')), 'rider: rời nhóm');
select tests.authenticate_as('rider2');
select is(public.join_group_tx((select id from t_g where name = 'open')), 'accepted'::public.member_status, 'rider2: chỗ trống → tham gia được');
select tests.authenticate_as('host');
select throws_ok(format($$ select public.leave_group('%s') $$, (select id from t_g where name = 'open')),
  'P0001', 'host_cannot_leave', 'host: chủ nhóm không rời, chỉ huỷ');
select is((select count(*)::int from public.notifications where user_id = auth.uid() and body_key = 'join_request.body_left'), 1,
  'host: thông báo có người rời nhóm');

-- ── chặn, bị cấm ────────────────────────────────────────────────────────────────
select tests.authenticate_as('outsider');
insert into public.blocks (blocked_id) values (tests.get_uid('host'));
select throws_ok(format($$ select public.join_group_tx('%s') $$, (select id from t_g where name = 'approve')),
  'P0001', 'blocked', 'outsider: đã chặn chủ nhóm → không tham gia');
select is((select count(*)::int from public.search_groups('ride') where id in (select id from t_g)), 0, 'outsider: nhóm của người bị chặn ẩn');
select is((select count(*)::int from public.groups), 0, 'outsider: không đọc bảng gốc');
select is((select count(*)::int from public.group_members where group_id = (select id from t_g where name = 'approve')), 0,
  'outsider: không đọc thành viên nhóm người khác');

select tests.authenticate_as('bad');
select throws_ok($$ insert into public.groups (kind, sub_kind, title, starts_at, seats_total, origin_text, destination_text)
                    values ('ride', 'car_owner', 'Bị cấm tạo nhóm', now() + interval '1 day', 3, 'Cổng', 'Đà Nẵng') $$,
  '42501', null, 'bị cấm: không tạo nhóm');
select throws_ok(format($$ select public.join_group_tx('%s') $$, (select id from t_g where name = 'approve')),
  'P0001', 'banned', 'bị cấm: không tham gia');
select ok((select count(*) from public.search_groups('ride')) > 0, 'bị cấm: vẫn xem danh sách');

-- ── moderator ───────────────────────────────────────────────────────────────────
select tests.authenticate_as('mod');
select is((select count(*)::int from public.groups where id in (select id from t_g)), 2, 'moderator: đọc bảng gốc');
select is((select count(*)::int from public.group_members where group_id = (select id from t_g where name = 'approve')), 3,
  'moderator: đọc thành viên');
select lives_ok(format($$ update public.groups set title = 'Moderator sửa' where id = '%s' $$, (select id from t_g where name = 'approve')),
  'moderator: update nhóm người khác không lỗi…');
select is((select title from public.groups where id = (select id from t_g where name = 'approve')), 'Dung Quất → Đà Nẵng',
  '… nhưng không đổi dòng nào (RLS)');

-- ── huỷ nhóm ────────────────────────────────────────────────────────────────────
select tests.authenticate_as('host');
select throws_ok(format($$ update public.groups set status = 'completed' where id = '%s' $$, (select id from t_g where name = 'approve')),
  '42501', null, 'host: không tự đặt completed');
select lives_ok(format($$ update public.groups set status = 'cancelled' where id = '%s' $$, (select id from t_g where name = 'approve')),
  'host: huỷ nhóm');
select throws_ok(format($$ update public.groups set title = 'Sửa sau khi huỷ' where id = '%s' $$, (select id from t_g where name = 'approve')),
  'P0001', 'group_closed', 'host: nhóm đã huỷ không sửa được');
select tests.authenticate_as('rider');
select is((select count(*)::int from public.notifications where user_id = auth.uid() and type = 'group_cancelled'), 1,
  'rider: thông báo nhóm bị huỷ');
select throws_ok(format($$ select public.join_group_tx('%s') $$, (select id from t_g where name = 'approve')),
  'P0001', 'group_closed', 'rider: nhóm đã huỷ không tham gia được');

select * from finish();
rollback;
