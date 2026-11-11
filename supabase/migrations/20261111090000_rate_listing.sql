-- Đánh giá + lời cảm ơn sau khi trao trả đồ thất lạc (ratings context listing)
-- Mục đích:
--   1. list_listing_counterparts(listing_id): người đã nhắn tin với mình về một tin (chủ tin thấy mọi người đã chat về
--      tin; người khác chỉ thấy chủ tin nếu đã chat) — tên "An N." + avatar, kèm điểm mình đã chấm trong tin này. Dùng để
--      chủ tin chọn người được cảm ơn / đánh giá; không SĐT, không họ tên đầy đủ.
--   2. rate_listing(listing_id, ratee_id, score, comment): đánh giá một lần / tin (unique ratings (rater, context)) sau khi
--      tin đồ thất lạc đã "trả lại" (attributes.returned = true, mark_listing_returned). Hai người phải có hội thoại về tin
--      (đã có tin nhắn) và một trong hai là chủ tin. Lời nhận xét lọc SĐT / từ cấm như chat (chat_message_violation);
--      20 lần / giờ. Người được chấm nhận thông báo type 'system' (khoá ns push rating_received.title / body — không thêm
--      loại thông báo mới, push luôn gửi như 'system'), data mở tin.
-- Bảng / hàm ảnh hưởng: ratings (ghi qua RPC definer — client vẫn không insert thẳng), notifications. Không đổi bảng.
-- Client: @hp/core ratings.ts (rateListing, listListingCounterparts) + hook useRateListing / useListingCounterparts,
--   key keys.listingCounterparts(id); @hp/shared RateListingInput; i18n errors.{listing_not_returned,
--   listing_already_rated, cannot_rate_self, rating_no_chat}, push.rating_received.*, listing.lost_found.rate_*.
--
-- Ma trận quyền
-- | Vai trò   | list_listing_counterparts                       | rate_listing                                           |
-- |-----------|-------------------------------------------------|--------------------------------------------------------|
-- | anon      | – (42501)                                       | – (42501)                                              |
-- | user      | chủ tin: người đã chat về tin; người khác: chủ   | chủ tin ↔ người đã chat về tin, sau khi đã trả lại,     |
-- |           | tin nếu đã chat; còn lại: rỗng                  | một lần / tin; không tự chấm, không chấm người bị cấm   |
-- | bị cấm    | như user (chỉ đọc hội thoại của mình)            | không (banned)                                          |
-- | moderator | như user (không thêm quyền)                     | như user                                                |
--
-- Explain (seed): list_listing_counterparts → listings_pkey, conversations_context_idx (context_type, context_id),
--   conversation_members pk (conversation_id, user_id), ratings unique (rater_id, context_type, context_id); rate_listing
--   dùng cùng các index (một tin, vài hội thoại) — không cần index mới.

-- ═════════════════════════════════════════════════════════════════════════════
-- list_listing_counterparts — người đã nhắn tin về tin (đã có tin nhắn), mới nhất trước, tối đa 50.
-- Definer: đọc listings của tin đã đóng / ẩn khỏi public_listings và profiles (tên rút gọn) — lọc chặt theo hội thoại
-- mà người gọi là thành viên. Bỏ người bị cấm / khoá tạm / đã xoá và cặp đã chặn nhau.
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.list_listing_counterparts(p_listing_id uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  is_owner boolean,
  conversation_id uuid,
  last_message_at timestamptz,
  my_score smallint
)
language sql stable security definer set search_path = '' as $$
  select p.id, public.short_name(p.full_name), p.avatar_url, p.id = l.owner_id, c.id, c.last_message_at, r.score
  from public.listings l
  join public.conversations c
    on c.kind = 'direct' and c.context_type = 'listing' and c.context_id = l.id and c.last_message_at is not null
  join public.conversation_members me on me.conversation_id = c.id and me.user_id = (select auth.uid())
  join public.conversation_members o on o.conversation_id = c.id and o.user_id <> me.user_id
  join public.profiles p on p.id = o.user_id
  left join public.ratings r
    on r.rater_id = me.user_id and r.context_type = 'listing' and r.context_id = l.id and r.ratee_id = p.id
  where l.id = p_listing_id
    and l.deleted_at is null
    and (l.owner_id = me.user_id or o.user_id = l.owner_id)
    and not p.is_banned and (p.banned_until is null or p.banned_until <= now()) and p.deleted_at is null
    and not public.is_blocked(me.user_id, p.id)
  order by c.last_message_at desc
  limit 50;
$$;
comment on function public.list_listing_counterparts(uuid) is
  'Người đã nhắn tin với mình về một tin (chủ tin: mọi người; người khác: chủ tin). Tên "An N." + avatar, không SĐT.';
revoke execute on function public.list_listing_counterparts(uuid) from public, anon;
grant execute on function public.list_listing_counterparts(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- rate_listing — chấm 1–5 + lời cảm ơn sau khi trao trả đồ thất lạc. Một lần / tin / người chấm.
-- Lỗi P0001: auth_required, banned, invalid_input, cannot_rate_self, not_found, listing_not_returned, forbidden,
--   rating_no_chat, listing_already_rated, message_has_phone, message_profanity, rate_limited.
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.rate_listing(p_listing_id uuid, p_ratee_id uuid, p_score int, p_comment text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.listings;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_violation text;
  v_rater_name text;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if public.is_banned() then
    raise exception using errcode = 'P0001', message = 'banned';
  end if;
  if p_listing_id is null or p_ratee_id is null or p_score is null or p_score not between 1 and 5
     or char_length(v_comment) > 500 then
    raise exception using errcode = 'P0001', message = 'invalid_input';
  end if;
  if p_ratee_id = v_uid then
    raise exception using errcode = 'P0001', message = 'cannot_rate_self';
  end if;

  select * into v_listing from public.listings
  where id = p_listing_id and deleted_at is null and category in ('lost', 'found');
  if v_listing.id is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  -- Một trong hai là chủ tin (chủ tin cảm ơn người trả / nhận; người kia đánh giá chủ tin).
  if v_listing.owner_id <> v_uid and v_listing.owner_id <> p_ratee_id then
    raise exception using errcode = 'P0001', message = 'forbidden';
  end if;
  if coalesce((v_listing.attributes ->> 'returned')::boolean, false) is not true then
    raise exception using errcode = 'P0001', message = 'listing_not_returned';
  end if;
  -- Người được chấm còn hoạt động (không bị cấm / khoá tạm / xoá) và hai bên không chặn nhau.
  if not exists (select 1 from public.profiles p
                 where p.id = p_ratee_id and not p.is_banned and p.deleted_at is null
                   and (p.banned_until is null or p.banned_until <= now()))
     or public.is_blocked(v_uid, p_ratee_id) then
    raise exception using errcode = 'P0001', message = 'forbidden';
  end if;
  -- Hai người đã nhắn tin với nhau về tin này.
  if not exists (
    select 1 from public.conversations c
    join public.conversation_members a on a.conversation_id = c.id and a.user_id = v_uid
    join public.conversation_members b on b.conversation_id = c.id and b.user_id = p_ratee_id
    where c.kind = 'direct' and c.context_type = 'listing' and c.context_id = p_listing_id
      and c.last_message_at is not null
  ) then
    raise exception using errcode = 'P0001', message = 'rating_no_chat';
  end if;

  v_violation := public.chat_message_violation(v_comment);
  if v_violation is not null then
    raise exception using errcode = 'P0001', message = v_violation;
  end if;
  perform public.assert_rate_limit(v_uid::text, 'rate_listing', 20, 3600);

  begin
    insert into public.ratings (rater_id, ratee_id, context_type, context_id, score, comment)
    values (v_uid, p_ratee_id, 'listing', p_listing_id, p_score, v_comment);
  exception
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'listing_already_rated';
  end;

  select public.short_name(full_name) into v_rater_name from public.profiles where id = v_uid;
  insert into public.notifications (user_id, type, title_key, body_key, params, data)
  values (p_ratee_id, 'system', 'rating_received.title', 'rating_received.body',
          jsonb_build_object('name', coalesce(v_rater_name, ''), 'score', p_score, 'title', v_listing.title),
          jsonb_build_object('screen', 'listing', 'params', jsonb_build_object('id', p_listing_id)));
end;
$$;
comment on function public.rate_listing(uuid, uuid, int, text) is
  'Đánh giá + lời cảm ơn sau khi trao trả đồ thất lạc (chủ tin ↔ người đã chat về tin). Một lần / tin / người chấm.';
revoke execute on function public.rate_listing(uuid, uuid, int, text) from public, anon;
grant execute on function public.rate_listing(uuid, uuid, int, text) to authenticated;
