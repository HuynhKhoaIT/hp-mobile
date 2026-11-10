-- Vòng đời nhóm + tin, đánh giá sau nhóm, nhóm của tôi, chat nhóm — tuần 8
-- Mục đích:
--   1. remind_groups(): nhắc chủ nhóm + thành viên trước giờ diễn ra 60 phút (notification group_reminder → push).
--   2. expire_content(): nhóm tới giờ → in_progress; qua ends_at (hoặc starts_at + 3h) → completed + mời đánh giá
--      (group_completed); tin quá expires_at → expired; nhắc gia hạn tin trước 3 ngày (listing_expiring).
--   3. rate_group(): thành viên đã được nhận chấm điểm chủ nhóm sau khi nhóm diễn ra (ratings context group).
--   4. View my_groups: nhóm mình tạo / đã xin / đã tham gia + vai trò + điểm mình đã chấm.
--   5. Chat nhóm: list_conversations thêm thông tin nhóm (hiện trong hộp thư cho mọi thành viên),
--      chat nhóm có tin mới vào hộp thư; list_conversation_members (tên / avatar người gửi), thông báo new_message của chat nhóm có tên nhóm.
-- Bảng / hàm ảnh hưởng: notifications (type group_completed), notification_push_enabled, list_conversations (đổi kiểu
--   trả về → drop + create), trg_messages_after_insert. pg_cron: remind-groups (15 phút), expire-content (mỗi giờ).
-- Client: @hp/core groups.ts (myGroups, rateGroup), chat.ts (ConversationSummary có group_*, listConversationMembers);
--   i18n push group_reminder / group_completed / listing_expiring / new_message.group_*; NOTIFICATION_SCREENS.
--
-- Lệch có chủ đích so với ARCHITECTURE: remind-groups / expire-content là hàm SQL do pg_cron gọi thẳng, không qua
--   Edge Function — chỉ đổi dữ liệu + tạo notifications trong DB (push đi qua webhook send-push sẵn có), không cần
--   secret / dịch vụ ngoài, nên không cần app.functions_url / app.cron_secret.
--
-- Ma trận quyền
-- | Vai trò   | remind_groups / expire_content | rate_group                     | my_groups      | list_conversation_members |
-- |-----------|--------------------------------|--------------------------------|----------------|---------------------------|
-- | anon      | –                              | –                              | –              | –                         |
-- | user      | – (chỉ cron / postgres)        | thành viên accepted, sau giờ    | của mình       | member hội thoại          |
-- | bị cấm    | –                              | không                          | của mình       | member hội thoại          |
-- | moderator | –                              | như user                       | của mình       | member hội thoại          |
--
-- Explain: remind_groups dùng groups_remind_idx (partial, starts_at); expire_content dùng groups_kind_status_starts_idx
--   và listings (status, expires_at) — index listings_status_expires_idx thêm dưới.

-- ═════════════════════════════════════════════════════════════════════════════
-- Notification type mới: group_completed (mời đánh giá) — khớp NOTIFICATION_SCREENS ở @hp/shared.
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'new_message', 'join_request', 'join_accepted', 'join_declined', 'group_cancelled', 'group_reminder', 'group_completed',
  'listing_approved', 'listing_rejected', 'listing_expiring', 'lost_found_match', 'system'
));

create or replace function public.notification_push_enabled(p_prefs jsonb, p_type text)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select coalesce((p_prefs ->> (case
    when p_type = 'new_message' then 'messages'
    when p_type in ('listing_approved', 'listing_rejected', 'listing_expiring') then 'listings'
    when p_type in ('join_request', 'join_accepted', 'join_declined', 'group_cancelled', 'group_reminder',
                    'group_completed') then 'groups'
    when p_type = 'lost_found_match' then 'lost_found'
  end))::boolean, true);
$$;

create index if not exists listings_status_expires_idx on public.listings (status, expires_at) where deleted_at is null;
create index if not exists notifications_expiring_idx on public.notifications ((data -> 'params' ->> 'id'))
  where type = 'listing_expiring';

-- ═════════════════════════════════════════════════════════════════════════════
-- remind_groups — cron 15 phút. Nhóm open / full bắt đầu trong 60 phút tới, chưa nhắc → nhắc chủ nhóm + accepted.
-- Giờ trong params theo giờ Việt Nam (HH:MI). Trả số thông báo đã tạo.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.remind_groups()
returns int language plpgsql volatile security definer set search_path = '' as $$
declare
  v_n int;
begin
  with due as (
    update public.groups g
    set reminded_at = now()
    where g.reminded_at is null
      and g.status in ('open', 'full')
      and g.deleted_at is null
      and g.starts_at > now()
      and g.starts_at <= now() + interval '60 minutes'   -- GROUP_RULES.reminderMinutes
    returning g.id, g.host_id, g.kind, g.title, g.starts_at
  ), targets as (
    select d.id, d.kind, d.title, d.starts_at, d.host_id as user_id from due d
    union all
    select d.id, d.kind, d.title, d.starts_at, m.user_id
    from due d join public.group_members m on m.group_id = d.id and m.status = 'accepted'
  )
  insert into public.notifications (user_id, type, title_key, body_key, params, data)
  select t.user_id, 'group_reminder', 'group_reminder.title', 'group_reminder.body_' || t.kind::text,
         jsonb_build_object('title', t.title,
                            'time', to_char(t.starts_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI')),
         jsonb_build_object('screen', 'group', 'params', jsonb_build_object('id', t.id))
  from targets t
  join public.profiles p on p.id = t.user_id and p.deleted_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
comment on function public.remind_groups() is 'Cron 15 phút: group_reminder trước giờ diễn ra 60 phút (một lần / nhóm).';
revoke execute on function public.remind_groups() from public, anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- expire_content — cron mỗi giờ. Trả jsonb số dòng mỗi việc (để log / test).
-- ═════════════════════════════════════════════════════════════════════════════
create function public.expire_content()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_started int;
  v_completed int;
  v_expired int;
  v_expiring int;
begin
  -- 1. Tới giờ: open / full → in_progress (hết nhận người; trang chi tiết hiện "đang diễn ra").
  update public.groups
  set status = 'in_progress'
  where status in ('open', 'full') and deleted_at is null and starts_at <= now();
  get diagnostics v_started = row_count;

  -- 2. Qua ends_at (hoặc starts_at + 3h) → completed + mời thành viên accepted đánh giá chủ nhóm.
  with done as (
    update public.groups
    set status = 'completed'
    where status = 'in_progress' and deleted_at is null
      and coalesce(ends_at, starts_at + interval '3 hours') <= now()   -- GROUP_RULES.completeAfterHours
    returning id, title
  ), notified as (
    insert into public.notifications (user_id, type, title_key, body_key, params, data)
    select m.user_id, 'group_completed', 'group_completed.title', 'group_completed.body',
           jsonb_build_object('title', d.title),
           jsonb_build_object('screen', 'group', 'params', jsonb_build_object('id', d.id))
    from done d
    join public.group_members m on m.group_id = d.id and m.status = 'accepted'
    join public.profiles p on p.id = m.user_id and p.deleted_at is null
    returning 1
  )
  select count(*)::int into v_completed from done;

  -- 3. Tin quá hạn → expired (trigger moderate / guard bỏ qua vai trò postgres; webhook revalidate vẫn chạy).
  update public.listings
  set status = 'expired'
  where status = 'active' and deleted_at is null and expires_at is not null and expires_at <= now();
  get diagnostics v_expired = row_count;

  -- 4. Sắp hết hạn (≤ 3 ngày): nhắc chủ tin một lần cho mỗi mốc expires_at (gia hạn → mốc mới → nhắc lại).
  insert into public.notifications (user_id, type, title_key, body_key, params, data)
  select l.owner_id, 'listing_expiring', 'listing_expiring.title', 'listing_expiring.body',
         jsonb_build_object('title', l.title, 'expires_at', l.expires_at),
         jsonb_build_object('screen', 'listing', 'params', jsonb_build_object('id', l.id))
  from public.listings l
  join public.profiles p on p.id = l.owner_id and p.deleted_at is null
  where l.status = 'active' and l.deleted_at is null
    and l.expires_at > now() and l.expires_at <= now() + interval '3 days'   -- LISTING_EXPIRING_NOTICE_DAYS
    and not exists (
      select 1 from public.notifications n
      where n.type = 'listing_expiring' and n.data -> 'params' ->> 'id' = l.id::text
        and (n.params ->> 'expires_at')::timestamptz = l.expires_at
    );
  get diagnostics v_expiring = row_count;

  return jsonb_build_object('groups_started', v_started, 'groups_completed', v_completed,
                            'listings_expired', v_expired, 'listings_expiring', v_expiring);
end;
$$;
comment on function public.expire_content() is
  'Cron mỗi giờ: nhóm → in_progress / completed (+ group_completed), tin → expired, nhắc listing_expiring trước 3 ngày.';
revoke execute on function public.expire_content() from public, anon, authenticated;

-- Lịch (cron.schedule cùng tên = cập nhật, chạy lại migration không nhân đôi job).
select cron.schedule('remind-groups', '*/15 * * * *', $$select public.remind_groups()$$);
select cron.schedule('expire-content', '5 * * * *', $$select public.expire_content()$$);

-- ═════════════════════════════════════════════════════════════════════════════
-- rate_group — thành viên accepted chấm chủ nhóm sau khi nhóm diễn ra (in_progress / completed). Một lần / nhóm
-- (unique ratings (rater, context)). Lời nhận xét lọc SĐT / từ cấm như chat.
-- Lỗi P0001: auth_required, banned, not_found, forbidden, group_not_finished, already_rated, invalid_input,
--   message_has_phone, message_profanity.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.rate_group(p_group_id uuid, p_score int, p_comment text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_group public.groups;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_violation text;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if public.is_banned() then
    raise exception using errcode = 'P0001', message = 'banned';
  end if;
  if p_score is null or p_score not between 1 and 5 or char_length(v_comment) > 500 then
    raise exception using errcode = 'P0001', message = 'invalid_input';
  end if;
  select * into v_group from public.groups where id = p_group_id and deleted_at is null;
  if v_group.id is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if not exists (select 1 from public.group_members
                 where group_id = p_group_id and user_id = v_uid and status = 'accepted') then
    raise exception using errcode = 'P0001', message = 'forbidden';
  end if;
  if v_group.status not in ('in_progress', 'completed') and not (v_group.status in ('open', 'full') and v_group.starts_at <= now()) then
    raise exception using errcode = 'P0001', message = 'group_not_finished';
  end if;
  v_violation := public.chat_message_violation(v_comment);
  if v_violation is not null then
    raise exception using errcode = 'P0001', message = v_violation;
  end if;
  insert into public.ratings (rater_id, ratee_id, context_type, context_id, score, comment)
  values (v_uid, v_group.host_id, 'group', p_group_id, p_score, v_comment);
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'already_rated';
end;
$$;
comment on function public.rate_group(uuid, int, text) is 'Thành viên chấm chủ nhóm (1–5) sau giờ diễn ra. Một lần / nhóm.';
revoke execute on function public.rate_group(uuid, int, text) from public, anon;
grant execute on function public.rate_group(uuid, int, text) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- my_groups — nhóm của tôi (invoker trên public_groups + group_members theo RLS). my_role: host | requested | accepted.
-- is_upcoming: còn hoạt động (open / full / in_progress). my_rating: điểm mình đã chấm (null = chưa).
-- Client: tab "Sắp tới" (is_upcoming, starts_at tăng dần), "Đã qua" (not is_upcoming, starts_at giảm dần).
-- ═════════════════════════════════════════════════════════════════════════════
create view public.my_groups with (security_invoker = true) as
select v.*,
       case when v.host_id = (select auth.uid()) then 'host' else m.status::text end as my_role,
       (v.status in ('open', 'full', 'in_progress')) as is_upcoming,
       r.score as my_rating
from public.public_groups v
left join public.group_members m on m.group_id = v.id and m.user_id = (select auth.uid())
left join public.ratings r on r.context_type = 'group' and r.context_id = v.id and r.rater_id = (select auth.uid())
where v.host_id = (select auth.uid())
   or m.status in ('requested', 'accepted');
comment on view public.my_groups is 'Nhóm của người gọi: tự tạo / đang xin / đã được nhận.';
grant select on public.my_groups to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Chat nhóm
-- ═════════════════════════════════════════════════════════════════════════════
-- Thành viên một hội thoại (tên "An N.", avatar) cho màn chat nhóm. RLS conversation_members: chỉ member đọc.
create function public.list_conversation_members(p_conversation_id uuid)
returns table (user_id uuid, display_name text, avatar_url text, badges text[], joined_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select m.user_id, pp.display_name, pp.avatar_url, pp.badges, m.created_at
  from public.conversation_members m
  left join public.public_profiles pp on pp.id = m.user_id
  where m.conversation_id = p_conversation_id
  order by m.created_at;
$$;
comment on function public.list_conversation_members(uuid) is 'Thành viên hội thoại (chỉ member gọi được qua RLS).';
revoke execute on function public.list_conversation_members(uuid) from public, anon;
grant execute on function public.list_conversation_members(uuid) to authenticated;

-- Hộp thư: thêm thông tin nhóm (group_*, member_count). Chat nhóm chỉ vào hộp thư khi đã có tin (tránh mỗi nhóm đã
-- tham gia là một dòng trống); trước đó mở từ nút "Chat nhóm" ở trang nhóm (p_conversation_id vẫn trả dòng).
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
  last_sender_name text
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
    case when c.kind = 'group' then ls.display_name end
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
  left join public.public_profiles ls on c.kind = 'group' and ls.id = c.last_sender_id
  where me.user_id = (select auth.uid())
    and (p_conversation_id is null or c.id = p_conversation_id)
    and (c.last_message_at is not null or (c.kind = 'direct' and c.created_by = me.user_id) or p_conversation_id is not null)
    and (p_cursor is null or coalesce(c.last_message_at, c.created_at) < p_cursor)
  order by coalesce(c.last_message_at, c.created_at) desc
  limit least(coalesce(p_limit, 20), 50);
$$;
comment on function public.list_conversations(int, timestamptz, uuid) is
  'Hộp thư của người gọi (1-1 + chat nhóm đã có tin; cursor = coalesce(last_message_at, created_at)). unread_count tối đa 99.';
revoke execute on function public.list_conversations(int, timestamptz, uuid) from public, anon;
grant execute on function public.list_conversations(int, timestamptz, uuid) to authenticated;

-- new_message: chat nhóm dùng khoá new_message.group_* (tiêu đề = tên nhóm, thân "An N.: …").
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
  select c.kind = 'group', coalesce(l.title, g.title) into v_is_group, v_context_title
  from public.conversations c
  left join public.listings l on c.context_type = 'listing' and l.id = c.context_id
  left join public.groups g on c.context_type = 'group' and g.id = c.context_id
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
revoke execute on function public.trg_messages_after_insert() from public, anon, authenticated;
