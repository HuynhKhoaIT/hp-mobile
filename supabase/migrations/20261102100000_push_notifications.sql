-- Push notification (tuần 6)
-- Mục đích: đăng ký Expo push token theo thiết bị, tuỳ chọn bật / tắt push theo nhóm, webhook gọi Edge Function
--   send-push khi có notification mới (notification là nguồn sự thật; push chỉ là kênh nhắc).
-- Bảng: profiles (guard push_tokens, CHECK notification_prefs), notifications (cột pushed_at).
-- RPC: register_push_token, unregister_push_token (đăng nhập, definer).
-- Client: @hp/core notifications.ts (registerPushToken, unregisterPushToken, updateNotificationPrefs) + hooks.
--
-- Thiết kế
-- - push_tokens chỉ đổi qua RPC: một token thuộc đúng một người (máy đăng nhập tài khoản khác → token chuyển chủ),
--   tối đa MAX_PUSH_TOKENS (5) / người, mới nhất trước. Client không update thẳng (guard).
-- - notification_prefs = { messages | listings | groups | lost_found: boolean }, thiếu = bật (NOTIFICATION_PREF_KEYS
--   ở @hp/shared). Chỉ ảnh hưởng push, danh sách trong app luôn đủ.
-- - Webhook trg_notifications_push: chỉ gọi send-push khi người nhận có token và đang bật nhóm đó (web-only không tốn
--   lượt gọi). Cấu hình app_settings: functions_url, webhook_secret (local: seed; staging / prod: RUNBOOK). Chưa cấu
--   hình → không gửi. pg_net gửi sau commit, không làm chậm giao dịch tạo notification.
-- - Gộp tin nhắn 1 phút, template theo locale, xoá token hỏng: ở send-push (cần gọi Expo — dịch vụ ngoài).
--
-- Ma trận quyền
-- | Vai trò   | register / unregister_push_token | profiles.push_tokens (update thẳng) | notification_prefs | pushed_at |
-- |-----------|----------------------------------|-------------------------------------|--------------------|-----------|
-- | anon      | –                                | –                                   | –                  | –         |
-- | user      | token của mình                   | – (guard)                           | sửa của mình       | –         |
-- | bị cấm    | được (vẫn nhận thông báo khoá)   | –                                   | sửa của mình       | –         |
-- | moderator | như user                         | –                                   | như user           | –         |
-- | service   | –                                | được                                | –                  | ghi       |

-- ═════════════════════════════════════════════════════════════════════════════
-- notification_prefs: chỉ nhận các nhóm đã biết, giá trị boolean
-- ═════════════════════════════════════════════════════════════════════════════
create function public.valid_notification_prefs(p jsonb)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select jsonb_typeof(p) = 'object'
    and not exists (
      select 1 from jsonb_each(p) e
      where e.key not in ('messages', 'listings', 'groups', 'lost_found') or jsonb_typeof(e.value) <> 'boolean'
    );
$$;
grant execute on function public.valid_notification_prefs(jsonb) to authenticated;

alter table public.profiles
  add constraint profiles_notification_prefs_valid check (public.valid_notification_prefs(notification_prefs));
comment on column public.profiles.notification_prefs is
  'Bật / tắt push theo nhóm: { "messages" | "listings" | "groups" | "lost_found": boolean }, thiếu = bật. NOTIFICATION_PREF_KEYS ở packages/shared.';

-- Push loại này có bật không (cùng logic isPushEnabled ở @hp/shared).
create function public.notification_push_enabled(p_prefs jsonb, p_type text)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select coalesce((p_prefs ->> (case
    when p_type = 'new_message' then 'messages'
    when p_type in ('listing_approved', 'listing_rejected', 'listing_expiring') then 'listings'
    when p_type in ('join_request', 'join_accepted', 'group_reminder') then 'groups'
    when p_type = 'lost_found_match' then 'lost_found'
  end))::boolean, true);
$$;
grant execute on function public.notification_push_enabled(jsonb, text) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Guard profiles: thêm push_tokens (chỉ RPC / service role đổi)
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.trg_profiles_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  -- Không ai sửa từ client
  if new.id is distinct from old.id
     or new.phone is distinct from old.phone
     or new.reputation_score is distinct from old.reputation_score
     or new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count
     or new.created_at is distinct from old.created_at
     or new.push_tokens is distinct from old.push_tokens then
    raise exception using errcode = '42501', message = 'forbidden', detail = 'profiles: cột chỉ server được đổi';
  end if;

  -- Chỉ staff: huy hiệu, khoá tạm
  if not public.is_staff()
     and (new.badges is distinct from old.badges or new.banned_until is distinct from old.banned_until) then
    raise exception using errcode = '42501', message = 'forbidden', detail = 'profiles: badges / banned_until chỉ staff';
  end if;

  -- Chỉ admin: vai trò, cấm vĩnh viễn
  if not public.is_admin()
     and (new.role is distinct from old.role or new.is_banned is distinct from old.is_banned) then
    raise exception using errcode = '42501', message = 'forbidden', detail = 'profiles: role / is_banned chỉ admin';
  end if;

  return new;
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- RPC đăng ký / huỷ token (definer: ghi profiles của người khác khi token chuyển chủ)
-- ═════════════════════════════════════════════════════════════════════════════
create function public.register_push_token(p_token text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'register_push_token: không phải Expo push token';
  end if;

  -- Máy này trước đó đăng nhập tài khoản khác → bỏ token khỏi tài khoản đó (không nhận nhầm push)
  update public.profiles set push_tokens = array_remove(push_tokens, p_token)
  where p_token = any (push_tokens) and id <> v_uid;

  update public.profiles
  set push_tokens = (array_prepend(p_token, array_remove(push_tokens, p_token)))[1:5]   -- MAX_PUSH_TOKENS
  where id = v_uid;
end;
$$;
comment on function public.register_push_token(text) is 'Gắn Expo push token của máy vào người gọi (chuyển chủ nếu máy đổi tài khoản), tối đa 5.';
revoke execute on function public.register_push_token(text) from public, anon;
grant execute on function public.register_push_token(text) to authenticated;

create function public.unregister_push_token(p_token text)
returns void language sql volatile security definer set search_path = '' as $$
  update public.profiles set push_tokens = array_remove(push_tokens, p_token) where id = (select auth.uid());
$$;
comment on function public.unregister_push_token(text) is 'Bỏ token của máy khỏi người gọi (gọi trước khi đăng xuất).';
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- notifications.pushed_at + webhook send-push
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.notifications add column pushed_at timestamptz;
comment on column public.notifications.pushed_at is 'send-push đã gửi push cho thông báo này lúc nào (service role ghi). Dùng gộp tin nhắn 1 phút.';
create index notifications_push_collapse_idx on public.notifications (user_id, type, pushed_at desc) where pushed_at is not null;

create function public.trg_notifications_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url text := public.app_setting('functions_url');
  v_secret text := public.app_setting('webhook_secret');
begin
  if v_url is null or v_secret is null then
    return null;
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = new.user_id and cardinality(p.push_tokens) > 0 and p.deleted_at is null
      and public.notification_push_enabled(p.notification_prefs, new.type)
  ) then
    return null;   -- web-only hoặc đã tắt nhóm này: không gọi function
  end if;
  perform net.http_post(
    url := v_url || '/send-push',
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret)
  );
  return null;
end;
$$;
revoke execute on function public.trg_notifications_push() from public, anon, authenticated;
create trigger trg_notifications_push after insert on public.notifications
  for each row execute function public.trg_notifications_push();
