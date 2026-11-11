-- Đánh giá sau khi trao trả đồ thất lạc (migration 20261111090000_rate_listing): rate_listing, list_listing_counterparts.
-- Vai trò: anon, chủ tin (owner), người đã chat (finder), người ngoài chưa chat (stranger), bị cấm (bad), moderator (mod).
begin;
\ir _helpers.psql
select plan(31);

select tests.create_user('owner');
select tests.create_user('finder');
select tests.create_user('stranger');
select tests.create_user('bad');
select tests.create_user('mod', 'moderator');

create temp table t_l (name text primary key, id uuid);
grant all on t_l to authenticated, anon;

-- Tin thất lạc (mất ví) của owner + tin nhặt được thứ hai + một tin pass đồ — tạo bằng postgres như tin đã duyệt.
with x as (
  insert into public.listings (owner_id, category, title, status, attributes)
  values (tests.get_uid('owner'), 'lost', 'Mất ví da nâu rtlq', 'active', jsonb_build_object('item_type', 'wallet'))
  returning id)
insert into t_l select 'lost', id from x;
with x as (
  insert into public.listings (owner_id, category, title, status, attributes)
  values (tests.get_uid('owner'), 'found', 'Nhặt được chìa khoá rtlq', 'active', jsonb_build_object('item_type', 'keys'))
  returning id)
insert into t_l select 'found', id from x;
with x as (
  insert into public.listings (owner_id, category, title, status, price, price_type)
  values (tests.get_uid('owner'), 'pass_home', 'Quạt cũ rtlq', 'active', 100000, 'fixed')
  returning id)
insert into t_l select 'pass', id from x;
update public.listings set attributes = attributes || '{"returned": true}'::jsonb where id = (select id from t_l where name = 'pass');

-- Hội thoại về tin (đã có tin nhắn): owner ↔ finder, owner ↔ mod, owner ↔ bad (tin 'lost'); owner ↔ bad (tin 'found');
-- owner ↔ finder (tin 'pass'). Người bị cấm chỉ bị cấm sau khi đã chat.
create temp table t_c (listing text, other text, id uuid);
grant all on t_c to authenticated, anon;
with pairs (listing, other) as (values ('lost', 'finder'), ('lost', 'mod'), ('lost', 'bad'), ('found', 'bad'), ('pass', 'finder')),
ins as (
  insert into public.conversations (kind, context_type, context_id, user_low, user_high, created_by, last_message_at)
  select 'direct', 'listing', l.id, least(tests.get_uid('owner'), tests.get_uid(p.other)),
         greatest(tests.get_uid('owner'), tests.get_uid(p.other)), tests.get_uid(p.other), now()
  from pairs p join t_l l on l.name = p.listing
  returning id, context_id, user_low, user_high)
insert into t_c
select l.name, u.identifier, ins.id
from ins join t_l l on l.id = ins.context_id
join tests.users u on u.id in (ins.user_low, ins.user_high) and u.identifier <> 'owner';
insert into public.conversation_members (conversation_id, user_id)
select id, tests.get_uid('owner') from t_c union all select id, tests.get_uid(other) from t_c;
select tests.ban_user('bad');

-- ── anon ────────────────────────────────────────────────────────────────────────
select tests.clear_auth();
select throws_ok(format($$ select public.rate_listing('%s', '%s', 5, null) $$, (select id from t_l where name = 'lost'), tests.get_uid('owner')),
  '42501', null, 'anon: không gọi rate_listing');
select throws_ok(format($$ select * from public.list_listing_counterparts('%s') $$, (select id from t_l where name = 'lost')),
  '42501', null, 'anon: không gọi list_listing_counterparts');

-- ── chưa trả lại ────────────────────────────────────────────────────────────────
select tests.authenticate_as('owner');
select throws_ok(format($$ select public.rate_listing('%s', '%s', 5, null) $$, (select id from t_l where name = 'lost'), tests.get_uid('finder')),
  'P0001', 'listing_not_returned', 'chủ tin: chưa trả lại thì chưa đánh giá được');
select is((select count(*)::int from public.list_listing_counterparts((select id from t_l where name = 'lost'))), 2,
  'chủ tin: thấy người đã chat (finder, mod), bỏ người bị cấm');
select is((select display_name from public.list_listing_counterparts((select id from t_l where name = 'lost'))
           where user_id = tests.get_uid('finder')), 'finder T.', 'chủ tin: tên rút gọn "An N." (không họ tên đầy đủ)');
select ok(not exists (select 1 from public.list_listing_counterparts((select id from t_l where name = 'lost')) where is_owner),
  'chủ tin: không có chính mình trong danh sách');

select tests.authenticate_as('finder');
select results_eq($$ select user_id, is_owner from public.list_listing_counterparts((select id from t_l where name = 'lost')) $$,
  $$ values (tests.get_uid('owner'), true) $$, 'người đã chat: chỉ thấy chủ tin');
select tests.authenticate_as('stranger');
select is((select count(*)::int from public.list_listing_counterparts((select id from t_l where name = 'lost'))), 0,
  'người ngoài: không thấy ai');

-- ── trả lại ────────────────────────────────────────────────────────────────────
select tests.authenticate_as('owner');
select lives_ok(format($$ select public.mark_listing_returned('%s') $$, (select id from t_l where name = 'lost')), 'chủ tin: đánh dấu đã nhận lại');
select lives_ok(format($$ select public.mark_listing_returned('%s') $$, (select id from t_l where name = 'found')), 'chủ tin: đánh dấu đã trả (tin nhặt được)');

select throws_ok(format($$ select public.rate_listing('%s', '%s', 5, null) $$, (select id from t_l where name = 'lost'), tests.get_uid('owner')),
  'P0001', 'cannot_rate_self', 'chủ tin: không tự đánh giá');
select throws_ok(format($$ select public.rate_listing('%s', '%s', 6, null) $$, (select id from t_l where name = 'lost'), tests.get_uid('finder')),
  'P0001', 'invalid_input', 'điểm ngoài 1–5 bị từ chối');
select throws_ok(format($$ select public.rate_listing('%s', '%s', 5, '%s') $$, (select id from t_l where name = 'lost'), tests.get_uid('finder'), repeat('a', 501)),
  'P0001', 'invalid_input', 'nhận xét > 500 ký tự bị từ chối');
select throws_ok(format($$ select public.rate_listing('%s', '%s', 5, 'Gọi mình 0912345678 nhé') $$, (select id from t_l where name = 'lost'), tests.get_uid('finder')),
  'P0001', 'message_has_phone', 'nhận xét có SĐT bị chặn');
select throws_ok(format($$ select public.rate_listing('%s', '%s', 5, null) $$, (select id from t_l where name = 'pass'), tests.get_uid('finder')),
  'P0001', 'not_found', 'tin không phải đồ thất lạc: không đánh giá qua rate_listing');
select throws_ok(format($$ select public.rate_listing('%s', '%s', 5, null) $$, (select id from t_l where name = 'found'), tests.get_uid('bad')),
  'P0001', 'forbidden', 'chủ tin: không đánh giá người đang bị cấm');
select throws_ok(format($$ select public.rate_listing('%s', '%s', 4, null) $$, (select id from t_l where name = 'lost'), tests.get_uid('stranger')),
  'P0001', 'rating_no_chat', 'chủ tin: không đánh giá người chưa nhắn tin về tin');

select lives_ok(format($$ select public.rate_listing('%s', '%s', 5, '  Cảm ơn bạn rất nhiều!  ') $$, (select id from t_l where name = 'lost'), tests.get_uid('finder')),
  'chủ tin: cảm ơn + đánh giá người trả đồ');
select is((select my_score::int from public.list_listing_counterparts((select id from t_l where name = 'lost'))
           where user_id = tests.get_uid('finder')), 5, 'chủ tin: thấy điểm mình đã chấm');
select throws_ok(format($$ select public.rate_listing('%s', '%s', 4, null) $$, (select id from t_l where name = 'lost'), tests.get_uid('finder')),
  'P0001', 'listing_already_rated', 'chủ tin: không đánh giá trùng');
select throws_ok(format($$ select public.rate_listing('%s', '%s', 4, null) $$, (select id from t_l where name = 'lost'), tests.get_uid('mod')),
  'P0001', 'listing_already_rated', 'chủ tin: một lần / tin (không chấm thêm người thứ hai)');
select throws_ok(format($$ insert into public.ratings (rater_id, ratee_id, context_type, context_id, score) values ('%s', '%s', 'listing', '%s', 1) $$,
                        tests.get_uid('owner'), tests.get_uid('mod'), (select id from t_l where name = 'found')),
  '42501', null, 'client không insert ratings trực tiếp');

reset role;
select results_eq($$ select score::int, comment from public.ratings where rater_id = tests.get_uid('owner') $$,
  $$ values (5, 'Cảm ơn bạn rất nhiều!'::text) $$, 'lưu đúng điểm + nhận xét đã cắt khoảng trắng');
select results_eq($$ select rating_count, rating_avg::numeric from public.profiles where id = tests.get_uid('finder') $$,
  $$ values (1, 5::numeric) $$, 'trigger cập nhật rating_count / rating_avg của người được chấm');
select results_eq($$ select type, title_key, body_key, params ->> 'name', data -> 'params' ->> 'id' from public.notifications
                    where user_id = tests.get_uid('finder') and title_key = 'rating_received.title' $$,
  $$ values ('system'::text, 'rating_received.title'::text, 'rating_received.body'::text, 'owner T.'::text, (select id::text from t_l where name = 'lost')) $$,
  'người được chấm nhận thông báo system (tên rút gọn, mở tin)');

-- ── phía người đã chat ───────────────────────────────────────────────────────────
select tests.authenticate_as('finder');
select lives_ok(format($$ select public.rate_listing('%s', '%s', 4, null) $$, (select id from t_l where name = 'lost'), tests.get_uid('owner')),
  'người đã chat: đánh giá chủ tin');
select throws_ok(format($$ select public.rate_listing('%s', '%s', 4, null) $$, (select id from t_l where name = 'lost'), tests.get_uid('mod')),
  'P0001', 'forbidden', 'người đã chat: không đánh giá người khác ngoài chủ tin');

select tests.authenticate_as('stranger');
select throws_ok(format($$ select public.rate_listing('%s', '%s', 1, null) $$, (select id from t_l where name = 'lost'), tests.get_uid('owner')),
  'P0001', 'rating_no_chat', 'người ngoài chưa chat: không đánh giá chủ tin');

-- ── bị cấm ─────────────────────────────────────────────────────────────────────
select tests.authenticate_as('bad');
select throws_ok(format($$ select public.rate_listing('%s', '%s', 1, null) $$, (select id from t_l where name = 'lost'), tests.get_uid('owner')),
  'P0001', 'banned', 'bị cấm: không đánh giá');

-- ── moderator (như user, không thêm quyền) ────────────────────────────────────────
select tests.authenticate_as('mod');
select lives_ok(format($$ select public.rate_listing('%s', '%s', 5, null) $$, (select id from t_l where name = 'lost'), tests.get_uid('owner')),
  'moderator đã chat: đánh giá chủ tin như user');
select is((select count(*)::int from public.list_listing_counterparts((select id from t_l where name = 'found'))), 0,
  'moderator: không thấy hội thoại của người khác');

select * from finish();
rollback;
