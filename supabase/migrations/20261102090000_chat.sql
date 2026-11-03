-- Chat 1-1 + báo cáo (tuần 5)
-- Mục đích: chat về một tin đăng giữa người xem và chủ tin; Realtime; ảnh riêng tư; thông báo new_message;
--   chặn có hiệu lực lên chat; báo cáo tin / nhóm / hồ sơ / tin nhắn, 3 báo cáo / 24h → tin bị ẩn tạm chờ duyệt.
-- Bảng: conversations, conversation_members, messages, reports, chat_banned_words (lọc từ cấm + SĐT trong chat). Bucket chat-images. Publication thêm messages.
-- RPC: start_listing_conversation (đăng nhập, definer), list_conversations / count_unread_conversations (invoker),
--   mark_conversation_read (invoker).
-- Client: @hp/core chat.ts + reports (social.ts) + hooks; type sinh lại ở packages/db.
--
-- Thiết kế
-- - Tạo hội thoại chỉ qua RPC (kiểm tin còn hiện, không tự chat với mình, không bị chặn); client không insert
--   conversations / conversation_members. Direct unique theo (context, cặp user) → mở lại vẫn ra hội thoại cũ.
-- - messages.id do client sinh (uuid): ảnh upload trước theo path {conversation_id}/{message_id}.webp, gửi lại sau
--   lỗi mạng không tạo bản trùng (23505 → client coi là đã gửi). Tin nhắn không sửa / xoá từ client.
-- - Group chat (kind = 'group') dùng chung bảng; trigger tạo hội thoại nhóm thêm ở tuần 7.
-- - Typing: Broadcast kênh riêng tư `conversation:{id}` (policy trên realtime.messages), không ghi DB.
--
-- Ma trận quyền
-- | Vai trò   | conversations | conversation_members        | messages                         | reports                   | chat-images |
-- |-----------|---------------|-----------------------------|----------------------------------|---------------------------|-------------|
-- | anon      | –             | –                           | –                                | –                         | –           |
-- | user      | member đọc    | member đọc; sửa dòng mình   | member đọc; gửi nếu không chặn  | tạo (3 / giờ), đọc của mình| member      |
-- |           |               | (last_read_at, muted)       | (50 / giờ nếu tài khoản < 7 ngày)|                           |             |
-- | bị cấm    | member đọc    | member đọc                  | đọc, không gửi                   | –                         | đọc         |
-- | moderator | như user      | như user                    | như user (không đọc chat người khác) | đọc / xử lý tất cả   | như user    |
--
-- Explain (seed): list_conversations dùng conversation_members_user_idx + messages_conv_created_idx;
--   count unread quét messages theo (conversation_id, created_at > last_read_at) trên index.

-- ═════════════════════════════════════════════════════════════════════════════
-- conversations
-- ═════════════════════════════════════════════════════════════════════════════
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'group')),
  context_type text check (context_type in ('listing', 'group')),
  context_id uuid,
  -- direct: cặp user sắp xếp (least, greatest) để unique không phụ thuộc ai mở trước
  user_low uuid references public.profiles (id) on delete set null,
  user_high uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  last_message_at timestamptz,
  last_message_preview text check (char_length(last_message_preview) <= 140),
  last_sender_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((context_type is null) = (context_id is null)),
  check (kind <> 'direct' or (user_low is not null and user_high is not null and user_low < user_high))
);
comment on table public.conversations is 'Hội thoại. direct: 1-1 về một tin (context listing); group: chat nhóm (tuần 7). Tạo qua RPC / trigger, không từ client.';
create unique index conversations_direct_uniq on public.conversations
  (coalesce(context_type, ''), coalesce(context_id, '00000000-0000-0000-0000-000000000000'::uuid), user_low, user_high)
  where kind = 'direct';
create index conversations_context_idx on public.conversations (context_type, context_id);
alter table public.conversations enable row level security;
grant select on public.conversations to authenticated;
create trigger trg_conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- conversation_members
-- ═════════════════════════════════════════════════════════════════════════════
create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id, conversation_id);
alter table public.conversation_members enable row level security;
grant select on public.conversation_members to authenticated;
grant update (last_read_at, muted) on public.conversation_members to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- messages
-- ═════════════════════════════════════════════════════════════════════════════
create table public.messages (
  id uuid primary key default gen_random_uuid(),            -- client sinh để upload ảnh trước + gửi lại không trùng
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid default auth.uid() references public.profiles (id) on delete set null,   -- null: tài khoản đã xoá (ẩn danh hoá)
  body text check (char_length(body) <= 2000),
  image_path text check (image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'),       -- bucket chat-images
  created_at timestamptz not null default now(),
  check (nullif(btrim(coalesce(body, '')), '') is not null or image_path is not null)
);
comment on column public.messages.image_path is 'Path trong bucket chat-images ({conversation_id}/{message_id}.webp), client đọc bằng signed URL 1 giờ.';
create index messages_conv_created_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_created_idx on public.messages (sender_id, created_at desc);
alter table public.messages enable row level security;
grant select, insert on public.messages to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Helper RLS
-- ═════════════════════════════════════════════════════════════════════════════
create function public.is_member(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = (select auth.uid())
  );
$$;
comment on function public.is_member(uuid) is 'Người gọi là thành viên hội thoại.';
grant execute on function public.is_member(uuid) to authenticated;

-- Gửi được: là member, không bị cấm, không chặn / bị chặn bởi member còn lại (chat 1-1).
create function public.can_send_message(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_member(p_conversation_id)
    and not public.is_banned()
    and not exists (
      select 1
      from public.conversations c
      join public.conversation_members m on m.conversation_id = c.id and m.user_id <> (select auth.uid())
      where c.id = p_conversation_id and c.kind = 'direct' and public.is_blocked((select auth.uid()), m.user_id)
    );
$$;
grant execute on function public.can_send_message(uuid) to authenticated;

-- Storage path → member? (cast an toàn: tên không phải uuid → false thay vì lỗi)
create function public.is_member_path(p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_folder text := split_part(p_name, '/', 1);
begin
  if v_folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.is_member(v_folder::uuid);
end;
$$;
grant execute on function public.is_member_path(text) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Policy
-- ═════════════════════════════════════════════════════════════════════════════
create policy conversations_select_member on public.conversations for select to authenticated
  using (public.is_member(id));

create policy conversation_members_select_member on public.conversation_members for select to authenticated
  using (public.is_member(conversation_id));
create policy conversation_members_update_own on public.conversation_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy messages_select_member on public.messages for select to authenticated
  using (public.is_member(conversation_id));
create policy messages_insert_member on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.can_send_message(conversation_id));

-- ═════════════════════════════════════════════════════════════════════════════
-- Lọc nội dung chat: không số điện thoại, không từ đồi trụy / thô tục.
--   Số điện thoại: người dùng hiện SĐT qua nút "Hiện SĐT" của tin (reveal_contact: đăng nhập, rate limit, audit),
--   không rải SĐT trong chat (lừa đảo kéo sang Zalo, spam). Cùng thuật toán với findPhoneNumber (@hp/shared).
--   Từ cấm: bảng chat_banned_words (admin quản lý ở /admin/catalog). match_mode:
--     exact    — so trên chữ thường CÓ dấu: từ dễ nhầm khi bỏ dấu ("lồn" ≠ "lớn", "đéo" ≠ "đeo").
--     unaccent — so sau khi bỏ dấu: viết tắt / cụm không nhầm được ("dcm", "vcl", "dit me").
--   So theo ranh giới từ (\m … \M) như banned_keywords: "lồng" không khớp "lồn".
-- ═════════════════════════════════════════════════════════════════════════════
create table public.chat_banned_words (
  id uuid primary key default gen_random_uuid(),
  word text not null check (char_length(btrim(word)) between 2 and 40 and word = lower(word) and word !~ '[^[:alnum:] ]'),
  match_mode text not null default 'exact' check (match_mode in ('exact', 'unaccent')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (word, match_mode)
);
comment on table public.chat_banned_words is 'Từ / cụm bị chặn trong tin nhắn chat. exact: so có dấu; unaccent: so sau bỏ dấu.';
alter table public.chat_banned_words enable row level security;
grant select, insert, update, delete on public.chat_banned_words to authenticated;
create trigger trg_chat_banned_words_updated_at before update on public.chat_banned_words
  for each row execute function public.set_updated_at();

create policy chat_banned_words_select_staff on public.chat_banned_words for select to authenticated
  using ((select public.is_staff()));
create policy chat_banned_words_insert_admin on public.chat_banned_words for insert to authenticated
  with check ((select public.is_admin()));
create policy chat_banned_words_update_admin on public.chat_banned_words for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy chat_banned_words_delete_admin on public.chat_banned_words for delete to authenticated
  using ((select public.is_admin()));

-- Bộ khởi đầu (mọi môi trường). Không chặn từ chửi nhẹ / dễ dùng nghĩa thường; admin bổ sung theo báo cáo thực tế.
insert into public.chat_banned_words (word, match_mode) values
  ('địt', 'exact'), ('đụ', 'exact'), ('đéo', 'exact'), ('lồn', 'exact'), ('buồi', 'exact'), ('cặc', 'exact'),
  ('đĩ', 'exact'), ('cứt', 'exact'), ('nứng', 'exact'), ('chịch', 'exact'), ('xoạc', 'exact'), ('đm', 'exact'),
  ('chó đẻ', 'exact'), ('óc chó', 'exact'), ('súc vật', 'exact'), ('bú cu', 'exact'),
  ('gái gọi', 'exact'), ('bán dâm', 'exact'), ('mua dâm', 'exact'), ('khiêu dâm', 'exact'),
  ('dit me', 'unaccent'), ('dit con me', 'unaccent'), ('du ma', 'unaccent'), ('du me', 'unaccent'),
  ('dmm', 'unaccent'), ('dcm', 'unaccent'), ('dkm', 'unaccent'), ('dcmm', 'unaccent'), ('vcl', 'unaccent'),
  ('vkl', 'unaccent'), ('clgt', 'unaccent'), ('cmm', 'unaccent'), ('sex', 'unaccent'), ('porn', 'unaccent')
on conflict do nothing;

-- Có số điện thoại VN? Bỏ dấu cách / . - _ ( ) / , * nằm GIỮA hai chữ số (bắt "0912.345.678", "0 9 1 2 …"),
-- rồi tìm 0 / 84 / +84 + 9–10 chữ số đứng riêng (không dính số khác: giá "2.500.000" không khớp).
create function public.has_phone_number(p_text text)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select coalesce(
    regexp_replace(p_text, '(?<=[0-9])[[:space:]._()/,*-]+(?=[0-9+])', '', 'g')
      ~ '(^|[^0-9])(\+?84|0)[1-9][0-9]{8,9}([^0-9]|$)',
    false);
$$;
grant execute on function public.has_phone_number(text) to authenticated;

-- Vi phạm của nội dung tin nhắn: null | 'message_has_phone' | 'message_profanity' (mã ns errors).
create function public.chat_message_violation(p_body text)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when p_body is null or btrim(p_body) = '' then null
    when public.has_phone_number(p_body) then 'message_has_phone'
    when exists (
      select 1 from public.chat_banned_words w
      where (w.match_mode = 'exact' and lower(p_body) ~ ('\m' || w.word || '\M'))
         or (w.match_mode = 'unaccent' and public.f_unaccent(lower(p_body)) ~ ('\m' || w.word || '\M'))
    ) then 'message_profanity'
  end;
$$;
comment on function public.chat_message_violation(text) is 'Lọc nội dung chat (SĐT, từ cấm). Gọi trong trg_messages_before_insert.';
revoke execute on function public.chat_message_violation(text) from public, anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Trigger messages
-- ═════════════════════════════════════════════════════════════════════════════
-- Trước insert: giờ server, rate limit tài khoản mới, ảnh phải nằm trong thư mục hội thoại + tên = id tin nhắn,
-- lọc nội dung (SĐT, từ cấm → P0001 message_has_phone / message_profanity).
create function public.trg_messages_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_created timestamptz;
  v_violation text;
begin
  new.created_at := now();
  new.body := nullif(btrim(new.body), '');
  if new.image_path is not null and split_part(new.image_path, '.', 1) <> new.conversation_id::text || '/' || new.id::text then
    raise exception using errcode = '23514', message = 'invalid_input', detail = 'messages: image_path phải là {conversation_id}/{id}.webp';
  end if;
  if coalesce(current_setting('role', true), 'none') in ('anon', 'authenticated') then
    v_violation := public.chat_message_violation(new.body);
    if v_violation is not null then
      raise exception using errcode = 'P0001', message = v_violation, detail = 'messages: nội dung bị chặn';
    end if;
    select created_at into v_created from public.profiles where id = new.sender_id;
    if v_created > now() - interval '7 days' then   -- NEW_ACCOUNT_DAYS, RATE_LIMITS.messagesPerHourNewAccount
      perform public.assert_rate_limit(new.sender_id::text, 'message', 50, 3600);
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_messages_before_insert() from public, anon, authenticated;
create trigger trg_messages_before_insert before insert on public.messages
  for each row execute function public.trg_messages_before_insert();

-- Sau insert: last_message_*, người gửi coi như đã đọc, notification new_message cho member khác
-- (trừ muted, trừ đang chặn nhau, trừ tài khoản đã xoá). Push gửi ở send-push (tuần 6) từ bảng notifications.
create function public.trg_messages_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_preview text := left(coalesce(new.body, ''), 140);
  v_sender_name text;
  v_context_title text;
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
  select l.title into v_context_title
  from public.conversations c join public.listings l on c.context_type = 'listing' and l.id = c.context_id
  where c.id = new.conversation_id;

  insert into public.notifications (user_id, type, title_key, body_key, params, data)
  select m.user_id, 'new_message', 'new_message.title',
         case when new.body is null then 'new_message.image' else 'new_message.body' end,   -- khoá trong ns push
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
revoke execute on function public.trg_messages_after_insert() from public, anon, authenticated;
create trigger trg_messages_after_insert after insert on public.messages
  for each row execute function public.trg_messages_after_insert();

-- Realtime: messages (lý do: chat realtime; RLS messages_select_member lọc theo member).
alter publication supabase_realtime add table public.messages;

-- ═════════════════════════════════════════════════════════════════════════════
-- RPC
-- ═════════════════════════════════════════════════════════════════════════════
-- Mở (hoặc lấy lại) hội thoại 1-1 với chủ một tin đang hiện. Lỗi: auth_required, banned, not_found (tin không
-- còn hiện / bị ẩn vì chặn), cannot_chat_self, blocked.
create function public.start_listing_conversation(p_listing_id uuid)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if public.is_banned() then
    raise exception using errcode = 'P0001', message = 'banned';
  end if;
  select l.owner_id into v_owner
  from public.listings l join public.profiles p on p.id = l.owner_id
  where l.id = p_listing_id and l.deleted_at is null and l.status in ('active', 'sold', 'closed')
    and not p.is_banned and p.deleted_at is null;
  if v_owner is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_owner = v_uid then
    raise exception using errcode = 'P0001', message = 'cannot_chat_self';
  end if;

  select id into v_id from public.conversations
  where kind = 'direct' and context_type = 'listing' and context_id = p_listing_id
    and user_low = least(v_uid, v_owner) and user_high = greatest(v_uid, v_owner);
  if v_id is not null then
    return v_id;   -- hội thoại cũ vẫn mở được (đọc lịch sử) kể cả khi đã chặn; gửi bị chặn ở RLS
  end if;

  if public.is_blocked(v_uid, v_owner) then
    raise exception using errcode = 'P0001', message = 'blocked';
  end if;

  insert into public.conversations (kind, context_type, context_id, user_low, user_high, created_by)
  values ('direct', 'listing', p_listing_id, least(v_uid, v_owner), greatest(v_uid, v_owner), v_uid)
  on conflict do nothing
  returning id into v_id;
  if v_id is null then   -- hai người mở cùng lúc
    select id into v_id from public.conversations
    where kind = 'direct' and context_type = 'listing' and context_id = p_listing_id
      and user_low = least(v_uid, v_owner) and user_high = greatest(v_uid, v_owner);
    return v_id;
  end if;

  insert into public.conversation_members (conversation_id, user_id) values (v_id, v_uid), (v_id, v_owner);
  return v_id;
end;
$$;
comment on function public.start_listing_conversation(uuid) is 'Mở hội thoại 1-1 với chủ tin (tạo nếu chưa có). Trả conversation id.';
revoke execute on function public.start_listing_conversation(uuid) from public, anon;
grant execute on function public.start_listing_conversation(uuid) to authenticated;

-- Hộp thư: hội thoại của người gọi, mới nhất trước, cursor theo last_message_at. Hội thoại chưa có tin nhắn chỉ hiện
-- với người mở. p_conversation_id → một dòng (header màn hội thoại). Tên người kia "An N." (public_profiles),
-- tin ngữ cảnh qua public_listings (null khi tin bị ẩn / xoá / chặn).
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
  created_at timestamptz
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
    -- người kia chặn mình: blocks của họ không đọc được (RLS) → is_blocked hai chiều trừ chiều của mình
    public.is_blocked(me.user_id, o.user_id)
      and not exists (select 1 from public.blocks b where b.blocker_id = me.user_id and b.blocked_id = o.user_id),
    c.created_at
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join lateral (
    select m.user_id, m.last_read_at from public.conversation_members m
    where m.conversation_id = c.id and m.user_id <> me.user_id
    order by m.created_at limit 1
  ) o on c.kind = 'direct'
  left join public.public_profiles pp on pp.id = o.user_id
  left join public.public_listings l on c.context_type = 'listing' and l.id = c.context_id
  where me.user_id = (select auth.uid())
    and (p_conversation_id is null or c.id = p_conversation_id)
    and (c.last_message_at is not null or c.created_by = me.user_id or p_conversation_id is not null)
    and (p_cursor is null or coalesce(c.last_message_at, c.created_at) < p_cursor)
  order by coalesce(c.last_message_at, c.created_at) desc
  limit least(coalesce(p_limit, 20), 50);
$$;
comment on function public.list_conversations(int, timestamptz, uuid) is
  'Hộp thư của người gọi (cursor = coalesce(last_message_at, created_at)). unread_count tối đa 99.';
revoke execute on function public.list_conversations(int, timestamptz, uuid) from public, anon;
grant execute on function public.list_conversations(int, timestamptz, uuid) to authenticated;

-- Số hội thoại có tin chưa đọc (chấm đỏ tab Chat / header web).
create function public.count_unread_conversations()
returns int language sql stable security invoker set search_path = '' as $$
  select count(*)::int
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  where me.user_id = (select auth.uid())
    and c.last_message_at > me.last_read_at
    and c.last_sender_id is distinct from me.user_id;
$$;
revoke execute on function public.count_unread_conversations() from public, anon;
grant execute on function public.count_unread_conversations() to authenticated;

-- Đánh dấu đã đọc hội thoại + các thông báo new_message của hội thoại đó.
create function public.mark_conversation_read(p_conversation_id uuid)
returns void language sql volatile security invoker set search_path = '' as $$
  update public.conversation_members set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = (select auth.uid());
  update public.notifications set read_at = now()
  where user_id = (select auth.uid()) and type = 'new_message' and read_at is null
    and data -> 'params' ->> 'id' = p_conversation_id::text;
$$;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Storage: chat-images (riêng tư, chỉ member; không ghi đè, không xoá từ client)
-- ═════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 2 * 1024 * 1024, array['image/webp', 'image/jpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy chat_images_select_member on storage.objects for select to authenticated
  using (bucket_id = 'chat-images' and public.is_member_path(name));
create policy chat_images_insert_member on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-images' and public.is_member_path(name) and not (select public.is_banned()));

-- ═════════════════════════════════════════════════════════════════════════════
-- Realtime Broadcast riêng tư `conversation:{id}` (đang gõ): chỉ member nghe / gửi.
-- ═════════════════════════════════════════════════════════════════════════════
create policy realtime_conversation_select_member on realtime.messages for select to authenticated
  using (
    realtime.topic() like 'conversation:%'
    and public.is_member_path(substr(realtime.topic(), 14))
  );
create policy realtime_conversation_insert_member on realtime.messages for insert to authenticated
  with check (
    realtime.topic() like 'conversation:%'
    and public.is_member_path(substr(realtime.topic(), 14))
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- reports — báo cáo tin / nhóm / hồ sơ / tin nhắn. Người báo cáo thấy của mình; staff xử lý.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'group', 'profile', 'message')),
  target_id uuid not null,
  reason text not null check (reason in ('scam', 'spam', 'inappropriate', 'other')),
  detail text check (char_length(detail) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Một báo cáo đang mở / người / đối tượng (báo lại → 23505, client coi như đã báo)
create unique index reports_open_uniq on public.reports (reporter_id, target_type, target_id) where status in ('open', 'reviewing');
create index reports_target_idx on public.reports (target_type, target_id, created_at desc);
create index reports_status_idx on public.reports (status, created_at);
alter table public.reports enable row level security;
grant select, insert on public.reports to authenticated;
grant update (status, resolved_by, resolved_at) on public.reports to authenticated;
create trigger trg_reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

create policy reports_select_own_or_staff on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_staff()));
create policy reports_insert_own on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and not (select public.is_banned()) and status = 'open');
create policy reports_update_staff on public.reports for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Trước insert: 3 báo cáo / giờ / người; không tự báo cáo mình / tin của mình.
create function public.trg_reports_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('role', true), 'none') not in ('anon', 'authenticated') then
    return new;
  end if;
  new.status := 'open';
  new.resolved_by := null;
  new.resolved_at := null;
  if (new.target_type = 'profile' and new.target_id = new.reporter_id)
     or (new.target_type = 'listing' and exists (select 1 from public.listings where id = new.target_id and owner_id = new.reporter_id)) then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'reports: không tự báo cáo mình';
  end if;
  perform public.assert_rate_limit(new.reporter_id::text, 'report', 3, 3600);   -- RATE_LIMITS.reportsPerHour
  return new;
end;
$$;
revoke execute on function public.trg_reports_before_insert() from public, anon, authenticated;
create trigger trg_reports_before_insert before insert on public.reports
  for each row execute function public.trg_reports_before_insert();

-- Sau insert: tin bị ≥ 3 người báo cáo trong 24 giờ → ẩn tạm (pending_review, lý do 'report') + vào hàng chờ.
create function public.trg_reports_auto_hide()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.target_type <> 'listing' then
    return null;
  end if;
  if (select count(distinct reporter_id) from public.reports
      where target_type = 'listing' and target_id = new.target_id and created_at > now() - interval '24 hours') < 3 then
    return null;
  end if;
  update public.listings
  set status = 'pending_review', moderation_reasons = array['report']
  where id = new.target_id and status = 'active' and deleted_at is null;
  if found then
    insert into public.moderation_queue (listing_id, reasons, risk_score, status)
    values (new.target_id, array['report'], 30, 'pending')
    on conflict (listing_id) where status = 'pending'
      do update set reasons = array(select distinct r from unnest(public.moderation_queue.reasons || excluded.reasons) r),
                    risk_score = greatest(public.moderation_queue.risk_score, excluded.risk_score), updated_at = now();
  end if;
  return null;
end;
$$;
revoke execute on function public.trg_reports_auto_hide() from public, anon, authenticated;
create trigger trg_reports_auto_hide after insert on public.reports
  for each row execute function public.trg_reports_auto_hide();

-- Staff xử lý báo cáo → audit_log (report.update)
create function public.trg_reports_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    new.resolved_by := coalesce((select auth.uid()), new.resolved_by);
    new.resolved_at := case when new.status in ('resolved', 'dismissed') then now() end;
    insert into public.audit_log (actor_id, action, target_type, target_id, meta)
    values ((select auth.uid()), 'report.update', 'report', new.id::text,
            jsonb_build_object('from', old.status, 'to', new.status, 'target_type', new.target_type, 'target_id', new.target_id));
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_reports_audit() from public, anon, authenticated;
create trigger trg_reports_audit before update on public.reports
  for each row execute function public.trg_reports_audit();
