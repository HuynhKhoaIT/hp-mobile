-- Chat 1-1 + báo cáo (20261102090000_chat).
-- Vai trò: anon, người mua (buyer), chủ tin (seller), người ngoài (outsider), bị cấm, tài khoản mới, moderator.
begin;
\ir _helpers.psql
select plan(75);

select tests.create_user('buyer');
select tests.create_user('seller');
select tests.create_user('outsider');
select tests.create_user('r3');
select tests.create_user('bad');
select tests.ban_user('bad');
select tests.create_user('newbie');
select tests.create_user('mod', 'moderator');
update public.profiles set created_at = now() - interval '30 days'
where id in (tests.get_uid('buyer'), tests.get_uid('seller'), tests.get_uid('outsider'), tests.get_uid('r3'), tests.get_uid('mod'));

-- tin của seller (chèn bằng postgres: bỏ qua kiểm duyệt tự động)
insert into public.listings (id, owner_id, category, title, status, price) values
  ('c0000000-0000-4000-8000-000000000001', tests.get_uid('seller'), 'pass_home', 'Quạt đứng chat zxqw', 'active', 150000),
  ('c0000000-0000-4000-8000-000000000002', tests.get_uid('seller'), 'pass_home', 'Nồi cơm chat zxqw', 'active', 200000),
  ('c0000000-0000-4000-8000-000000000003', tests.get_uid('seller'), 'pass_home', 'Bàn học chat zxqw', 'active', 300000),
  ('c0000000-0000-4000-8000-000000000004', tests.get_uid('seller'), 'pass_home', 'Tin nháp chat zxqw', 'draft', 100000);
create temp table t_conv (name text primary key, id uuid);
grant all on t_conv to authenticated, anon;

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select public.start_listing_conversation('c0000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'anon: không mở hội thoại');
select throws_ok($$ select count(*) from public.messages $$, '42501', null, 'anon: không đọc messages');
select throws_ok($$ select count(*) from public.conversations $$, '42501', null, 'anon: không đọc conversations');
select throws_ok($$ insert into public.reports (target_type, target_id, reason) values ('listing', 'c0000000-0000-4000-8000-000000000001', 'spam') $$,
  '42501', null, 'anon: không báo cáo');

-- ── mở hội thoại ────────────────────────────────────────────────────────────────
select tests.authenticate_as('buyer');
insert into t_conv values ('main', public.start_listing_conversation('c0000000-0000-4000-8000-000000000001'));
select isnt((select id from t_conv where name = 'main'), null, 'buyer: mở hội thoại với chủ tin');
select is(public.start_listing_conversation('c0000000-0000-4000-8000-000000000001'), (select id from t_conv where name = 'main'),
  'buyer: mở lại ra đúng hội thoại cũ (direct unique)');
select is((select count(*)::int from public.conversation_members where conversation_id = (select id from t_conv where name = 'main')), 2,
  'buyer: hội thoại có 2 thành viên');
select throws_ok($$ select public.start_listing_conversation('c0000000-0000-4000-8000-000000000004') $$,
  'P0001', 'not_found', 'buyer: không mở chat với tin nháp');
select throws_ok($$ insert into public.conversations (kind) values ('group') $$, '42501', null, 'buyer: không tạo conversations trực tiếp');
select throws_ok(format($$ insert into public.conversation_members (conversation_id, user_id) values ('%s', '%s') $$,
  (select id from t_conv where name = 'main'), tests.get_uid('outsider')), '42501', null, 'buyer: không tự thêm thành viên');
select is((select count(*)::int from public.list_conversations()), 1, 'buyer: hội thoại chưa có tin nhắn vẫn hiện với người mở');

select tests.authenticate_as('seller');
select throws_ok($$ select public.start_listing_conversation('c0000000-0000-4000-8000-000000000001') $$,
  'P0001', 'cannot_chat_self', 'seller: không chat với tin của chính mình');
select is((select count(*)::int from public.list_conversations()), 0, 'seller: hội thoại trống của người khác chưa hiện');

-- ── gửi tin ─────────────────────────────────────────────────────────────────────
select tests.authenticate_as('buyer');
select lives_ok(format($$ insert into public.messages (conversation_id, body) values ('%s', '  Còn hàng không ạ?  ') $$,
  (select id from t_conv where name = 'main')), 'buyer: gửi tin nhắn');
select lives_ok(format($$ insert into public.messages (id, conversation_id, image_path) values ('d0000000-0000-4000-8000-000000000001', '%1$s', '%1$s/d0000000-0000-4000-8000-000000000001.webp') $$,
  (select id from t_conv where name = 'main')), 'buyer: gửi ảnh (path = {conversation}/{message}.webp)');
select throws_ok(format($$ insert into public.messages (id, conversation_id, image_path) values ('d0000000-0000-4000-8000-000000000002', '%1$s', '%1$s/d0000000-0000-4000-8000-000000000009.webp') $$,
  (select id from t_conv where name = 'main')), '23514', null, 'buyer: ảnh phải mang đúng id tin nhắn');
select throws_ok(format($$ insert into public.messages (conversation_id, body) values ('%s', '   ') $$,
  (select id from t_conv where name = 'main')), '23514', null, 'buyer: không gửi tin rỗng');
select throws_ok(format($$ insert into public.messages (conversation_id, sender_id, body) values ('%s', '%s', 'giả mạo') $$,
  (select id from t_conv where name = 'main'), tests.get_uid('seller')), '42501', null, 'buyer: không gửi thay người khác');
select throws_ok($$ update public.messages set body = 'sửa' $$, '42501', null, 'buyer: không sửa tin nhắn');

reset role;
select is((select body from public.messages where conversation_id = (select id from t_conv where name = 'main') and image_path is null),
  'Còn hàng không ạ?', 'trigger: body được cắt khoảng trắng');
select is((select last_message_preview from public.conversations where id = (select id from t_conv where name = 'main')), null,
  'trigger: preview của tin ảnh để trống (client hiện "Ảnh")');
select is((select last_sender_id from public.conversations where id = (select id from t_conv where name = 'main')), tests.get_uid('buyer'),
  'trigger: last_sender_id');
select is((select count(*)::int from public.notifications where user_id = tests.get_uid('seller') and type = 'new_message'
           and data ->> 'screen' = 'chat' and data -> 'params' ->> 'id' = (select id::text from t_conv where name = 'main')), 2,
  'trigger: thông báo new_message cho chủ tin (deep link chat)');
select is((select count(*)::int from public.notifications where user_id = tests.get_uid('buyer') and type = 'new_message'), 0,
  'trigger: người gửi không nhận thông báo của chính mình');

-- ── người nhận ──────────────────────────────────────────────────────────────────
-- Cả file chạy trong một transaction (now() cố định) → lùi mốc đã đọc của người nhận để tin mới tính là chưa đọc.
update public.conversation_members set last_read_at = now() - interval '1 minute' where user_id = tests.get_uid('seller');
select tests.authenticate_as('seller');
select is((select unread_count from public.list_conversations()), 2, 'seller: 2 tin chưa đọc');
select is((select other_name from public.list_conversations()), 'buyer T.', 'seller: tên người kia dạng "tên + chữ cái họ"');
select is((select listing_title from public.list_conversations()), 'Quạt đứng chat zxqw', 'seller: kèm tin ngữ cảnh');
select is(public.count_unread_conversations(), 1, 'seller: 1 hội thoại chưa đọc');
select lives_ok(format($$ select public.mark_conversation_read('%s') $$, (select id from t_conv where name = 'main')), 'seller: đánh dấu đã đọc');
select is(public.count_unread_conversations(), 0, 'seller: hết chưa đọc');
select is((select count(*)::int from public.notifications where type = 'new_message' and read_at is null), 0,
  'seller: thông báo new_message của hội thoại cũng đã đọc');
select lives_ok(format($$ insert into public.messages (conversation_id, body) values ('%s', 'Còn bạn') $$,
  (select id from t_conv where name = 'main')), 'seller: trả lời');
select lives_ok(format($$ update public.conversation_members set muted = true where conversation_id = '%s' and user_id = auth.uid() $$,
  (select id from t_conv where name = 'main')), 'seller: tắt thông báo hội thoại');
select throws_ok(format($$ update public.conversation_members set user_id = '%s' where conversation_id = '%s' $$,
  tests.get_uid('outsider'), (select id from t_conv where name = 'main')), '42501', null, 'seller: chỉ sửa last_read_at / muted');

-- ── người ngoài + moderator ─────────────────────────────────────────────────────
select tests.authenticate_as('outsider');
select is((select count(*)::int from public.messages), 0, 'outsider: không đọc tin nhắn của người khác');
select is((select count(*)::int from public.conversations), 0, 'outsider: không thấy hội thoại');
select throws_ok(format($$ insert into public.messages (conversation_id, body) values ('%s', 'chen ngang') $$,
  (select id from t_conv where name = 'main')), '42501', null, 'outsider: không gửi vào hội thoại người khác');
select throws_ok(format($$ insert into storage.objects (bucket_id, name) values ('chat-images', '%s/x.webp') $$,
  (select id from t_conv where name = 'main')), '42501', null, 'outsider: không upload ảnh vào chat người khác');
select tests.authenticate_as('buyer');
select lives_ok(format($$ insert into storage.objects (bucket_id, name) values ('chat-images', '%s/d0000000-0000-4000-8000-000000000003.webp') $$,
  (select id from t_conv where name = 'main')), 'buyer: upload ảnh vào hội thoại của mình');
select tests.authenticate_as('mod');
select is((select count(*)::int from public.messages), 0, 'moderator: không đọc chat riêng của người khác');

-- ── chặn ────────────────────────────────────────────────────────────────────────
select tests.authenticate_as('seller');
insert into public.blocks (blocked_id) values (tests.get_uid('buyer'));
select is((select blocked_by_me from public.list_conversations()), true, 'chặn: người chặn thấy blocked_by_me');
select throws_ok(format($$ insert into public.messages (conversation_id, body) values ('%s', 'x') $$,
  (select id from t_conv where name = 'main')), '42501', null, 'chặn: người chặn không gửi được');
select tests.authenticate_as('buyer');
select is((select blocked_me from public.list_conversations()), true, 'chặn: người bị chặn thấy blocked_me');
select throws_ok(format($$ insert into public.messages (conversation_id, body) values ('%s', 'x') $$,
  (select id from t_conv where name = 'main')), '42501', null, 'chặn: người bị chặn không gửi được');
select is((select count(*)::int from public.messages), 3, 'chặn: lịch sử vẫn đọc được');

-- ── bị cấm, tài khoản mới ───────────────────────────────────────────────────────
select tests.authenticate_as('bad');
select throws_ok($$ select public.start_listing_conversation('c0000000-0000-4000-8000-000000000002') $$,
  'P0001', 'banned', 'bị cấm: không mở hội thoại');
select tests.authenticate_as('newbie');
insert into t_conv values ('newbie', public.start_listing_conversation('c0000000-0000-4000-8000-000000000002'));
select lives_ok(format($$ insert into public.messages (conversation_id, body) select '%s', 'tin ' || g from generate_series(1, 50) g $$,
  (select id from t_conv where name = 'newbie')), 'tài khoản mới: 50 tin / giờ được');
select throws_ok(format($$ insert into public.messages (conversation_id, body) values ('%s', 'tin 51') $$,
  (select id from t_conv where name = 'newbie')), 'P0001', 'rate_limited', 'tài khoản mới: tin thứ 51 trong giờ bị chặn');

-- ── lọc nội dung: SĐT, từ cấm ───────────────────────────────────────────────────
reset role;
select ok(public.has_phone_number('gọi em 0912345678 nhé'), 'lọc: SĐT liền');
select ok(public.has_phone_number('zalo 0912.345.678'), 'lọc: SĐT có dấu chấm');
select ok(public.has_phone_number('sdt: 0 9 1 2 3 4 5 6 7 8'), 'lọc: SĐT tách từng số');
select ok(public.has_phone_number('+84 912 345 678'), 'lọc: SĐT +84');
select ok(not public.has_phone_number('giá 2.500.000đ, bớt 300.000'), 'lọc: giá tiền không bị coi là SĐT');
select ok(not public.has_phone_number('phòng 12, tầng 3, 5h chiều'), 'lọc: số ngắn không bị coi là SĐT');
select is(public.chat_message_violation('Cái quạt này lớn không bạn?'), null, 'lọc: "lớn" không nhầm từ cấm');
select is(public.chat_message_violation('Mình đeo bảo hộ rồi, lồng chim còn không?'), null, 'lọc: "đeo", "lồng" không nhầm');
select is(public.chat_message_violation('đéo bán'), 'message_profanity', 'lọc: từ thô tục có dấu');
select is(public.chat_message_violation('DCM lừa đảo'), 'message_profanity', 'lọc: viết tắt thô tục (không phân biệt hoa thường)');
select is(public.chat_message_violation('dit me may'), 'message_profanity', 'lọc: cụm thô tục gõ không dấu');
select tests.authenticate_as('seller');
select throws_ok(format($$ insert into public.messages (conversation_id, body) values ('%s', 'Gọi mình 0912 345 678') $$,
  (select id from t_conv where name = 'newbie')), 'P0001', 'message_has_phone', 'lọc: không gửi SĐT trong chat');
select throws_ok(format($$ insert into public.messages (conversation_id, body) values ('%s', 'đồ chó đẻ') $$,
  (select id from t_conv where name = 'newbie')), 'P0001', 'message_profanity', 'lọc: không gửi từ thô tục');
select lives_ok(format($$ insert into public.messages (conversation_id, body) values ('%s', 'Nồi còn bảo hành 6 tháng, giá 200.000đ') $$,
  (select id from t_conv where name = 'newbie')), 'lọc: tin bình thường có giá tiền vẫn gửi được');
select tests.authenticate_as('outsider');
select is((select count(*)::int from public.chat_banned_words), 0, 'lọc: user không đọc danh sách từ cấm');
select tests.authenticate_as('mod');
select ok((select count(*) from public.chat_banned_words) > 0, 'lọc: moderator đọc danh sách từ cấm');
select throws_ok($$ insert into public.chat_banned_words (word) values ('thử') $$, '42501', null, 'lọc: moderator không sửa danh sách (chỉ admin)');

-- ── báo cáo ─────────────────────────────────────────────────────────────────────
select tests.authenticate_as('buyer');
select lives_ok($$ insert into public.reports (target_type, target_id, reason, detail) values ('listing', 'c0000000-0000-4000-8000-000000000003', 'scam', 'đòi cọc') $$,
  'báo cáo: user báo cáo tin');
select throws_ok($$ insert into public.reports (target_type, target_id, reason) values ('listing', 'c0000000-0000-4000-8000-000000000003', 'spam') $$,
  '23505', null, 'báo cáo: không báo trùng khi báo cáo trước còn mở');
select throws_ok(format($$ insert into public.reports (target_type, target_id, reason) values ('profile', '%s', 'spam') $$, tests.get_uid('buyer')),
  'P0001', 'invalid_input', 'báo cáo: không tự báo cáo mình');
select tests.authenticate_as('bad');
select throws_ok($$ insert into public.reports (target_type, target_id, reason) values ('listing', 'c0000000-0000-4000-8000-000000000003', 'spam') $$,
  '42501', null, 'bị cấm: không báo cáo');
select tests.authenticate_as('outsider');
insert into public.reports (target_type, target_id, reason) values ('listing', 'c0000000-0000-4000-8000-000000000003', 'scam');
select is((select count(*)::int from public.reports), 1, 'báo cáo: user chỉ thấy báo cáo của mình');
select tests.authenticate_as('r3');
insert into public.reports (target_type, target_id, reason) values ('listing', 'c0000000-0000-4000-8000-000000000003', 'scam');
insert into public.reports (target_type, target_id, reason) values ('listing', 'c0000000-0000-4000-8000-000000000002', 'spam');
insert into public.reports (target_type, target_id, reason) values ('listing', 'c0000000-0000-4000-8000-000000000001', 'spam');
select throws_ok(format($$ insert into public.reports (target_type, target_id, reason) values ('profile', '%s', 'spam') $$, tests.get_uid('seller')),
  'P0001', 'rate_limited', 'báo cáo: tối đa 3 / giờ');
reset role;
select is((select status::text from public.listings where id = 'c0000000-0000-4000-8000-000000000003'), 'pending_review',
  'báo cáo: 3 người báo cáo trong 24 giờ → tin bị ẩn chờ duyệt');
select ok((select 'report' = any (reasons) from public.moderation_queue where listing_id = 'c0000000-0000-4000-8000-000000000003' and status = 'pending'),
  'báo cáo: tin vào hàng chờ với lý do report');

select tests.authenticate_as('mod');
select lives_ok($$ update public.reports set status = 'resolved' where target_id = 'c0000000-0000-4000-8000-000000000003' $$,
  'moderator: xử lý báo cáo');
reset role;
select is((select count(*)::int from public.audit_log where action = 'report.update' and actor_id = tests.get_uid('mod')), 3,
  'moderator: mỗi báo cáo xử lý ghi audit_log');

select * from finish();
rollback;
