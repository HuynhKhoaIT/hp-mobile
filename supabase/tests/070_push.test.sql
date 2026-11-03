-- Push notification (20261102100000_push_notifications): token, tuỳ chọn, webhook send-push.
begin;
\ir _helpers.psql
select plan(20);

select tests.create_user('alice');
select tests.create_user('bob');
select tests.create_user('bad');
select tests.ban_user('bad');
select tests.create_user('mod', 'moderator');

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok($$ select public.register_push_token('ExponentPushToken[aaaa]') $$, '42501', null, 'anon: không đăng ký token');

-- ── đăng ký token ───────────────────────────────────────────────────────────────
select tests.authenticate_as('alice');
select lives_ok($$ select public.register_push_token('ExponentPushToken[device1]') $$, 'user: đăng ký token');
select throws_ok($$ select public.register_push_token('fcm-token-abc') $$, 'P0001', 'invalid_input', 'user: token sai định dạng bị từ chối');
select public.register_push_token('ExponentPushToken[device1]');
select is((select push_tokens from public.profiles where id = auth.uid()), array['ExponentPushToken[device1]'], 'user: đăng ký lại không trùng');
select public.register_push_token('ExponentPushToken[d2]'), public.register_push_token('ExponentPushToken[d3]'),
       public.register_push_token('ExponentPushToken[d4]'), public.register_push_token('ExponentPushToken[d5]'),
       public.register_push_token('ExponentPushToken[d6]');
select is((select cardinality(push_tokens) from public.profiles where id = auth.uid()), 5, 'user: tối đa 5 token');
select is((select push_tokens[1] from public.profiles where id = auth.uid()), 'ExponentPushToken[d6]', 'user: token mới nhất đứng đầu');
select throws_ok($$ update public.profiles set push_tokens = '{}' where id = auth.uid() $$, '42501', null, 'user: không sửa thẳng push_tokens');
select lives_ok($$ select public.unregister_push_token('ExponentPushToken[d6]') $$, 'user: huỷ token khi đăng xuất');
select ok((select not ('ExponentPushToken[d6]' = any (push_tokens)) from public.profiles where id = auth.uid()), 'user: token đã bỏ');

-- máy của alice đăng nhập bob → token chuyển chủ
select tests.authenticate_as('bob');
select public.register_push_token('ExponentPushToken[d5]');
reset role;
select ok((select not ('ExponentPushToken[d5]' = any (push_tokens)) from public.profiles where id = tests.get_uid('alice')),
  'chuyển chủ: token rời tài khoản cũ');
select is((select push_tokens from public.profiles where id = tests.get_uid('bob')), array['ExponentPushToken[d5]'], 'chuyển chủ: token thuộc tài khoản mới');

-- bị cấm vẫn nhận thông báo (vd khoá tài khoản) → vẫn đăng ký được
select tests.authenticate_as('bad');
select lives_ok($$ select public.register_push_token('ExponentPushToken[badphone]') $$, 'bị cấm: vẫn đăng ký token');

-- ── tuỳ chọn ────────────────────────────────────────────────────────────────────
select tests.authenticate_as('alice');
select lives_ok($$ update public.profiles set notification_prefs = '{"messages": false}' where id = auth.uid() $$, 'prefs: tắt push tin nhắn');
select throws_ok($$ update public.profiles set notification_prefs = '{"marketing": true}' where id = auth.uid() $$, '23514', null, 'prefs: nhóm lạ bị từ chối');
select throws_ok($$ update public.profiles set notification_prefs = '{"messages": "no"}' where id = auth.uid() $$, '23514', null, 'prefs: giá trị phải boolean');
select ok(not public.notification_push_enabled('{"messages": false}', 'new_message'), 'prefs: tắt messages → không push new_message');
select ok(public.notification_push_enabled('{"messages": false}', 'listing_approved'), 'prefs: nhóm khác vẫn push');
select ok(public.notification_push_enabled('{}', 'system'), 'prefs: loại lạ luôn push');

-- ── webhook send-push ───────────────────────────────────────────────────────────
reset role;
delete from net.http_request_queue;
insert into public.notifications (user_id, type, title_key) values (tests.get_uid('bob'), 'system', 'x.title');
insert into public.notifications (user_id, type, title_key) values (tests.get_uid('alice'), 'new_message', 'x.title');   -- đã tắt messages
insert into public.notifications (user_id, type, title_key) values (tests.get_uid('mod'), 'system', 'x.title');          -- không có token
select is((select count(*)::int from net.http_request_queue where url like '%/send-push'), 1,
  'webhook: chỉ gọi send-push khi người nhận có token và đang bật nhóm đó');
select ok((select (headers ->> 'x-webhook-secret') is not null from net.http_request_queue where url like '%/send-push' limit 1),
  'webhook: kèm secret');

select * from finish();
rollback;
