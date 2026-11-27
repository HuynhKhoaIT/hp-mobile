-- Gọi thợ: chat + chọn báo giá — tiếp migration 20261128090000_service_requests.
-- Mục đích: hội thoại 1-1 giữa chủ yêu cầu và thợ có báo giá (context_type 'service_request'); chọn báo giá trong một
--   transaction (accept_quote_tx); hộp thư hiện thông tin yêu cầu.
-- Bảng / hàm ảnh hưởng: conversations (CHECK context_type), list_conversations (đổi kiểu trả về → drop + create, thêm
--   cột request_* ở CUỐI), trg_messages_after_insert (tiêu đề thông báo new_message lấy tên yêu cầu).
-- RPC mới: start_request_conversation, accept_quote_tx (definer, khoá dòng yêu cầu). Nội bộ: open_request_conversation.
-- Client: @hp/core chat.ts (ConversationSummary có request_*, startRequestConversation), service-requests.ts (acceptQuote).
--
-- Quy tắc chat: chỉ mở giữa chủ yêu cầu và thợ có báo giá submitted / accepted. Hội thoại đã có vẫn đọc được lịch sử
-- sau khi yêu cầu đóng (RPC trả lại id cũ); hội thoại MỚI chỉ mở khi yêu cầu còn open / assigned / completed.
-- Lỗi P0001: auth_required, banned, not_found, forbidden, blocked, request_closed, quote_not_pending, cannot_chat_self.
--
-- Ma trận quyền (RPC)
-- | Vai trò   | start_request_conversation              | accept_quote_tx            |
-- |-----------|------------------------------------------|----------------------------|
-- | anon      | –                                        | –                          |
-- | user      | chủ (chỉ thợ có báo giá) / thợ có báo giá | chủ yêu cầu, yêu cầu open  |
-- | bị cấm    | không (banned)                           | không (banned)             |
-- | moderator | như user (không đọc chat người khác)      | như user                   |

-- ═════════════════════════════════════════════════════════════════════════════
-- conversations.context_type: thêm 'service_request'
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.conversations drop constraint if exists conversations_context_type_check;
alter table public.conversations add constraint conversations_context_type_check
  check (context_type in ('listing', 'group', 'service_request'));

-- ═════════════════════════════════════════════════════════════════════════════
-- open_request_conversation (nội bộ): lấy hoặc tạo hội thoại direct (yêu cầu, chủ, thợ). Không cấp cho client.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.open_request_conversation(p_request_id uuid, p_customer uuid, p_pro uuid, p_creator uuid)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  select id into v_id from public.conversations
  where kind = 'direct' and context_type = 'service_request' and context_id = p_request_id
    and user_low = least(p_customer, p_pro) and user_high = greatest(p_customer, p_pro);
  if v_id is not null then
    return v_id;
  end if;

  insert into public.conversations (kind, context_type, context_id, user_low, user_high, created_by)
  values ('direct', 'service_request', p_request_id, least(p_customer, p_pro), greatest(p_customer, p_pro), p_creator)
  on conflict do nothing
  returning id into v_id;
  if v_id is null then   -- hai bên mở cùng lúc
    select id into v_id from public.conversations
    where kind = 'direct' and context_type = 'service_request' and context_id = p_request_id
      and user_low = least(p_customer, p_pro) and user_high = greatest(p_customer, p_pro);
    return v_id;
  end if;

  insert into public.conversation_members (conversation_id, user_id) values (v_id, p_customer), (v_id, p_pro);
  return v_id;
end;
$$;
revoke execute on function public.open_request_conversation(uuid, uuid, uuid, uuid) from public, anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- start_request_conversation — chủ mở chat với một thợ đã báo giá (p_pro_id bắt buộc), hoặc thợ mở chat với chủ
-- (p_pro_id bỏ trống). Trả conversation id.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.start_request_conversation(p_request_id uuid, p_pro_id uuid default null)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_request public.service_requests;
  v_pro uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if public.is_banned() then
    raise exception using errcode = 'P0001', message = 'banned';
  end if;
  select r.* into v_request
  from public.service_requests r join public.profiles p on p.id = r.customer_id
  where r.id = p_request_id and r.deleted_at is null and p.deleted_at is null and not p.is_banned;
  if v_request.id is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  if v_uid = v_request.customer_id then
    if p_pro_id is null then
      raise exception using errcode = 'P0001', message = 'invalid_input';
    end if;
    if p_pro_id = v_uid then
      raise exception using errcode = 'P0001', message = 'cannot_chat_self';
    end if;
    v_pro := p_pro_id;
  else
    v_pro := v_uid;
  end if;
  if not exists (select 1 from public.service_quotes
                 where request_id = p_request_id and pro_id = v_pro and status in ('submitted', 'accepted')) then
    raise exception using errcode = 'P0001', message = case when v_uid = v_request.customer_id then 'not_found' else 'forbidden' end;
  end if;

  select id into v_id from public.conversations
  where kind = 'direct' and context_type = 'service_request' and context_id = p_request_id
    and user_low = least(v_request.customer_id, v_pro) and user_high = greatest(v_request.customer_id, v_pro);
  if v_id is not null then
    return v_id;   -- hội thoại cũ vẫn mở được (đọc lịch sử); gửi bị chặn ở RLS nếu đã chặn nhau
  end if;
  if v_request.status not in ('open', 'assigned', 'completed') then
    raise exception using errcode = 'P0001', message = 'request_closed';
  end if;
  if public.is_blocked(v_request.customer_id, v_pro) then
    raise exception using errcode = 'P0001', message = 'blocked';
  end if;
  return public.open_request_conversation(p_request_id, v_request.customer_id, v_pro, v_uid);
end;
$$;
comment on function public.start_request_conversation(uuid, uuid) is
  'Mở hội thoại 1-1 chủ yêu cầu ↔ thợ có báo giá (tạo nếu chưa có). Trả conversation id.';
revoke execute on function public.start_request_conversation(uuid, uuid) from public, anon;
grant execute on function public.start_request_conversation(uuid, uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- accept_quote_tx — chủ chọn một báo giá: yêu cầu open → assigned, các báo giá còn lại bị từ chối (thợ nhận
-- quote_declined), thợ được chọn nhận quote_accepted, mở chat với thợ. Trả conversation id.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.accept_quote_tx(p_quote_id uuid)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_quote public.service_quotes;
  v_request public.service_requests;
  v_pro_ok boolean;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if public.is_banned() then
    raise exception using errcode = 'P0001', message = 'banned';
  end if;
  select * into v_quote from public.service_quotes where id = p_quote_id;
  if v_quote.id is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  select * into v_request from public.service_requests where id = v_quote.request_id and deleted_at is null for update;
  if v_request.id is null or v_request.customer_id <> v_uid then
    raise exception using errcode = 'P0001', message = 'forbidden';
  end if;
  if v_request.status <> 'open' or v_request.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'request_closed';
  end if;
  select * into v_quote from public.service_quotes where id = p_quote_id for update;   -- đọc lại sau khi khoá yêu cầu
  if v_quote.status <> 'submitted' then
    raise exception using errcode = 'P0001', message = 'quote_not_pending';
  end if;
  select exists (select 1 from public.profiles where id = v_quote.pro_id and deleted_at is null and not is_banned)
    into v_pro_ok;
  if not v_pro_ok then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if public.is_blocked(v_uid, v_quote.pro_id) then
    raise exception using errcode = 'P0001', message = 'blocked';
  end if;

  update public.service_quotes set status = 'accepted' where id = p_quote_id;
  with declined as (
    update public.service_quotes set status = 'declined'
    where request_id = v_request.id and id <> p_quote_id and status = 'submitted'
    returning pro_id
  )
  insert into public.notifications (user_id, type, title_key, body_key, params, data)
  select d.pro_id, 'quote_declined', 'quote_declined.title', 'quote_declined.body',
         jsonb_build_object('title', v_request.title),
         jsonb_build_object('screen', 'service_request', 'params', jsonb_build_object('id', v_request.id))
  from declined d
  join public.profiles p on p.id = d.pro_id and p.deleted_at is null;

  update public.service_requests set status = 'assigned', accepted_quote_id = p_quote_id where id = v_request.id;

  insert into public.notifications (user_id, type, title_key, body_key, params, data)
  values (v_quote.pro_id, 'quote_accepted', 'quote_accepted.title', 'quote_accepted.body',
          jsonb_build_object('title', v_request.title, 'price', v_quote.price),
          jsonb_build_object('screen', 'service_request', 'params', jsonb_build_object('id', v_request.id)));

  return public.open_request_conversation(v_request.id, v_request.customer_id, v_quote.pro_id, v_uid);
end;
$$;
comment on function public.accept_quote_tx(uuid) is
  'Chủ chọn một báo giá (khoá dòng yêu cầu): open → assigned, từ chối báo giá còn lại, mở chat. Trả conversation id.';
revoke execute on function public.accept_quote_tx(uuid) from public, anon;
grant execute on function public.accept_quote_tx(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- list_conversations: thêm request_* (ở cuối). Giữ nguyên mọi cột / điều kiện của bản tuần 8.
-- ═════════════════════════════════════════════════════════════════════════════
drop function public.list_conversations(int, timestamptz, uuid);
create function public.list_conversations(
  p_limit int default 20,
  p_cursor timestamptz default null,
  p_conversation_id uuid default null
)
returns table (
  id uuid,
  kind text,
  context_type text,
  context_id uuid,
  listing_title text,
  listing_slug text,
  listing_image text,
  listing_price numeric,
  listing_price_type text,
  listing_status text,
  listing_category text,
  listing_owner_id uuid,
  other_user_id uuid,
  other_name text,
  other_avatar_url text,
  other_badges text[],
  other_last_read_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text,
  last_sender_id uuid,
  unread_count int,
  muted boolean,
  blocked_by_me boolean,
  blocked_me boolean,
  created_at timestamptz,
  group_title text,
  group_slug text,
  group_kind text,
  group_sub_kind text,
  group_status text,
  group_starts_at timestamptz,
  group_host_id uuid,
  member_count int,
  last_sender_name text,
  request_title text,
  request_trade text,
  request_status text,
  request_customer_id uuid,
  request_accepted_pro_id uuid
)
language sql stable security invoker set search_path = '' as $$
  select
    c.id, c.kind, c.context_type, c.context_id,
    l.title, l.slug, l.images[1], l.price, l.price_type, l.status::text, l.category::text, l.owner_id,
    o.user_id, pp.display_name, pp.avatar_url, pp.badges, o.last_read_at,
    c.last_message_at, c.last_message_preview, c.last_sender_id,
    (select count(*)::int from (
       select 1 from public.messages msg
       where msg.conversation_id = c.id and msg.created_at > me.last_read_at
         and msg.sender_id is distinct from me.user_id
       limit 99) u),
    me.muted,
    exists (select 1 from public.blocks b where b.blocker_id = me.user_id and b.blocked_id = o.user_id),
    public.is_blocked(me.user_id, o.user_id)
      and not exists (select 1 from public.blocks b where b.blocker_id = me.user_id and b.blocked_id = o.user_id),
    c.created_at,
    g.title, g.slug, g.kind::text, g.sub_kind, g.status::text, g.starts_at, g.host_id,
    case when c.kind = 'group' then (select count(*)::int from public.conversation_members cm where cm.conversation_id = c.id) end,
    case when c.kind = 'group' then ls.display_name end,
    sr.title, sr.trade::text, sr.status::text, sr.customer_id, sr.accepted_pro_id
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join lateral (
    select m.user_id, m.last_read_at from public.conversation_members m
    where m.conversation_id = c.id and m.user_id <> me.user_id
    order by m.created_at limit 1
  ) o on c.kind = 'direct'
  left join public.public_profiles pp on pp.id = o.user_id
  left join public.public_listings l on c.context_type = 'listing' and l.id = c.context_id
  left join public.public_groups g on c.context_type = 'group' and g.id = c.context_id
  left join public.public_service_requests sr on c.context_type = 'service_request' and sr.id = c.context_id
  left join public.public_profiles ls on c.kind = 'group' and ls.id = c.last_sender_id
  where me.user_id = (select auth.uid())
    and (p_conversation_id is null or c.id = p_conversation_id)
    and (c.last_message_at is not null or (c.kind = 'direct' and c.created_by = me.user_id) or p_conversation_id is not null)
    and (p_cursor is null or coalesce(c.last_message_at, c.created_at) < p_cursor)
  order by coalesce(c.last_message_at, c.created_at) desc
  limit least(coalesce(p_limit, 20), 50);
$$;
comment on function public.list_conversations(int, timestamptz, uuid) is
  'Hộp thư của người gọi (1-1 + chat nhóm đã có tin; cursor = coalesce(last_message_at, created_at)). unread_count tối đa 99. '
  'request_* = yêu cầu gọi thợ (null khi yêu cầu bị ẩn / xoá / chặn).';
revoke execute on function public.list_conversations(int, timestamptz, uuid) from public, anon;
grant execute on function public.list_conversations(int, timestamptz, uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- new_message: tiêu đề thông báo lấy tên tin / nhóm / yêu cầu gọi thợ.
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.trg_messages_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_preview text := left(coalesce(new.body, ''), 140);
  v_sender_name text;
  v_context_title text;
  v_is_group boolean;
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message_preview = nullif(v_preview, ''),
      last_sender_id = new.sender_id
  where id = new.conversation_id;

  update public.conversation_members
  set last_read_at = greatest(last_read_at, new.created_at)
  where conversation_id = new.conversation_id and user_id = new.sender_id;

  select public.short_name(p.full_name) into v_sender_name from public.profiles p where p.id = new.sender_id;
  select c.kind = 'group', coalesce(l.title, g.title, sr.title) into v_is_group, v_context_title
  from public.conversations c
  left join public.listings l on c.context_type = 'listing' and l.id = c.context_id
  left join public.groups g on c.context_type = 'group' and g.id = c.context_id
  left join public.service_requests sr on c.context_type = 'service_request' and sr.id = c.context_id
  where c.id = new.conversation_id;

  insert into public.notifications (user_id, type, title_key, body_key, params, data)
  select m.user_id, 'new_message',
         case when v_is_group then 'new_message.group_title' else 'new_message.title' end,
         case when v_is_group and new.body is null then 'new_message.group_image'
              when v_is_group then 'new_message.group_body'
              when new.body is null then 'new_message.image'
              else 'new_message.body' end,   -- khoá trong ns push
         jsonb_build_object('sender_name', coalesce(nullif(v_sender_name, ''), '…'),
                            'preview', left(coalesce(new.body, ''), 80),
                            'title', coalesce(v_context_title, '')),
         jsonb_build_object('screen', 'chat', 'params', jsonb_build_object('id', new.conversation_id))
  from public.conversation_members m
  join public.profiles p on p.id = m.user_id and p.deleted_at is null
  where m.conversation_id = new.conversation_id
    and m.user_id is distinct from new.sender_id
    and not m.muted
    and not public.is_blocked(m.user_id, new.sender_id);
  return null;
end;
$$;
