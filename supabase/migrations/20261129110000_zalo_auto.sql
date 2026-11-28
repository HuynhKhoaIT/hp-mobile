-- Gửi Zalo TỰ ĐỘNG cho staff (bổ sung zalo_outreach): staff kết nối Zalo cá nhân bằng mã QR (thư viện zca-js, API không chính thức,
-- chạy trong Edge Function zalo-connect / zalo-send — không có server riêng), rồi gửi thẳng từ hộp thoại "Nhắn Zalo".
-- Cách mở zalo.me (bán tự động) vẫn giữ nguyên. Hạn mức 15–30 tin / ngày và nghỉ 60–180 giây dùng chung với bán tự động
-- (zalo_quota); gửi lỗi thì hoàn lượt. Rủi ro đã được chấp nhận: Zalo có thể hạn chế tài khoản cá nhân dùng API không chính thức.
--
-- Bảng: zalo_accounts (tài khoản Zalo đã kết nối của từng staff; thông tin phiên MÃ HOÁ AES-GCM, client không đọc được cột đó),
--       zalo_qr_sessions (trạng thái quét QR để trang Kết nối Zalo hiện ảnh + theo dõi). zalo_messages thêm mode / status / error.
-- RPC (CHỈ service role — Edge Function gọi): reserve_zalo_auto (kiểm hạn mức, ghi tin 'sending', trả SĐT để gửi),
--       finish_zalo_auto (đánh dấu sent / failed, gửi lỗi → hoàn lượt). Client chỉ đọc zalo_accounts / zalo_qr_sessions của chính mình.
--
-- | Vai trò           | zalo_accounts (cột công khai) | credentials_enc | zalo_qr_sessions | reserve / finish_zalo_auto |
-- |-------------------|-------------------------------|-----------------|------------------|----------------------------|
-- | anon / user       | –                             | –               | –                | –                          |
-- | moderator, admin  | chỉ dòng của mình             | không đọc được  | chỉ dòng của mình| –                          |
-- | service role      | được                          | được            | được             | được                       |

-- ═════════════════════════════════════════════════════════════════════════════
-- Tài khoản Zalo đã kết nối (mỗi staff một tài khoản).
-- ═════════════════════════════════════════════════════════════════════════════
create table public.zalo_accounts (
  staff_id uuid primary key references public.profiles (id) on delete cascade,
  zalo_uid text,
  display_name text,
  avatar text,
  status text not null default 'connected' check (status in ('connected', 'expired')),
  credentials_enc text not null,
  connected_at timestamptz not null default now(),
  last_error text,
  updated_at timestamptz not null default now()
);
comment on table public.zalo_accounts is
  'Zalo cá nhân của staff đã kết nối bằng QR (zalo-connect). credentials_enc = AES-GCM(ZALO_SESSION_KEY) của {imei, userAgent, cookie} — chỉ service role đọc.';
alter table public.zalo_accounts enable row level security;
-- Client chỉ được đọc cột không nhạy cảm (credentials_enc KHÔNG nằm trong grant); ghi chỉ qua service role.
grant select (staff_id, zalo_uid, display_name, avatar, status, connected_at, last_error) on public.zalo_accounts to authenticated;
grant select, insert, update, delete on public.zalo_accounts to service_role;
create policy zalo_accounts_select_own on public.zalo_accounts for select to authenticated
  using (staff_id = (select auth.uid()) and (select public.is_staff()));
create trigger trg_zalo_accounts_updated_at before update on public.zalo_accounts
  for each row execute function public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- Phiên quét QR: Edge Function zalo-connect ghi ảnh QR + trạng thái; trang Kết nối Zalo hỏi lại bằng select (RLS: của mình).
-- ═════════════════════════════════════════════════════════════════════════════
create table public.zalo_qr_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'waiting_scan'
    check (status in ('waiting_scan', 'scanned', 'confirmed', 'expired', 'declined', 'error')),
  image text,
  display_name text,
  avatar text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.zalo_qr_sessions is
  'Một lần quét QR kết nối Zalo của staff: image = data URL PNG; status waiting_scan → scanned → confirmed | expired | declined | error.';
create index zalo_qr_sessions_staff_idx on public.zalo_qr_sessions (staff_id, created_at desc);
alter table public.zalo_qr_sessions enable row level security;
grant select on public.zalo_qr_sessions to authenticated;
grant select, insert, update, delete on public.zalo_qr_sessions to service_role;
create policy zalo_qr_sessions_select_own on public.zalo_qr_sessions for select to authenticated
  using (staff_id = (select auth.uid()) and (select public.is_staff()));
create trigger trg_zalo_qr_sessions_updated_at before update on public.zalo_qr_sessions
  for each row execute function public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- zalo_messages: phân biệt bán tự động (staff tự dán) với gửi tự động, và kết quả gửi.
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.zalo_messages
  add column mode text not null default 'manual' check (mode in ('manual', 'auto')),
  add column status text not null default 'recorded' check (status in ('recorded', 'sending', 'sent', 'failed')),
  add column error text check (char_length(error) <= 200),
  add column zalo_msg_id text;
comment on column public.zalo_messages.mode is 'manual = staff dán và gửi trong Zalo (reserve_zalo_message); auto = Edge Function zalo-send gửi.';
comment on column public.zalo_messages.status is 'manual luôn recorded; auto: sending → sent | failed (failed được hoàn lượt hạn mức).';

-- ═════════════════════════════════════════════════════════════════════════════
-- Hàm nội bộ + RPC cho Edge Function (service role). Client không gọi được.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.zalo_is_staff(p_user uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user and p.role in ('moderator', 'admin') and not p.is_banned
      and (p.banned_until is null or p.banned_until <= now()) and p.deleted_at is null
  );
$$;
revoke execute on function public.zalo_is_staff(uuid) from public, anon, authenticated;

-- reserve_zalo_auto — như reserve_zalo_message nhưng cho Edge Function: nhận staff (đã xác thực JWT ở function), ghi tin
-- mode 'auto' trạng thái 'sending', trả SĐT (84…) để function gửi. Hết lượt / đang nghỉ → {ok: false, reason, status}.
-- Lỗi P0001: invalid_input, not_found, no_phone. 42501: không phải staff.
create function public.reserve_zalo_auto(p_staff uuid, p_target_type text, p_target_id uuid, p_kind text, p_content text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_content text := btrim(coalesce(p_content, ''));
  v_phone text;
  v_type text;
  v_found boolean;
  v_row public.zalo_quota;
  v_status jsonb;
  v_msg uuid;
  v_now timestamptz := now();
  v_delay int;
begin
  if p_staff is null or not public.zalo_is_staff(p_staff) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_target_type is null or p_target_type not in ('lead', 'user')
     or p_kind is null or p_kind not in ('lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request')
     or p_target_id is null or char_length(v_content) not between 1 and 2000 then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'reserve_zalo_auto';
  end if;

  if p_target_type = 'lead' then
    select contact, contact_type into v_phone, v_type from public.marketing_leads where id = p_target_id;
    v_found := found;
    if v_found and v_type <> 'phone' then v_phone := null; end if;
  else
    select phone into v_phone from public.profiles where id = p_target_id and deleted_at is null;
    v_found := found;
  end if;
  if not v_found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_phone is null or v_phone !~ '^84[0-9]{8,10}$' then
    raise exception using errcode = 'P0001', message = 'no_phone';
  end if;

  perform public.zalo_today(p_staff);
  select * into v_row from public.zalo_quota
   where staff_id = p_staff and day = (now() at time zone 'Asia/Ho_Chi_Minh')::date for update;
  v_status := public.zalo_present(v_row);
  if not (v_status ->> 'can_send')::boolean then
    return jsonb_build_object('ok', false, 'reason', v_status ->> 'reason', 'status', v_status);
  end if;

  insert into public.zalo_messages (staff_id, target_type, target_id, kind, content, mode, status)
  values (p_staff, p_target_type, p_target_id, p_kind, v_content, 'auto', 'sending')
  returning id into v_msg;

  v_delay := 60 + floor(random() * 121)::int;
  update public.zalo_quota
     set sent = sent + 1, last_sent_at = v_now, next_allowed_at = v_now + make_interval(secs => v_delay)
   where staff_id = v_row.staff_id and day = v_row.day
  returning * into v_row;

  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (p_staff, 'zalo.send', case p_target_type when 'lead' then 'lead' else 'profile' end, p_target_id::text,
          jsonb_build_object('kind', p_kind, 'mode', 'auto'));

  return jsonb_build_object('ok', true, 'message_id', v_msg, 'phone', v_phone, 'status', public.zalo_present(v_row));
end;
$$;
comment on function public.reserve_zalo_auto(uuid, text, uuid, text, text) is
  'Edge Function zalo-send: kiểm hạn mức + nghỉ, ghi tin auto/sending, audit zalo.send (không SĐT / nội dung), trả SĐT để gửi. Chỉ service role.';
revoke execute on function public.reserve_zalo_auto(uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.reserve_zalo_auto(uuid, text, uuid, text, text) to service_role;

-- finish_zalo_auto — đánh dấu kết quả gửi. Lỗi → status failed + HOÀN lượt hạn mức (sent − 1, bỏ thời gian nghỉ) để staff thử lại.
create function public.finish_zalo_auto(p_message_id uuid, p_ok boolean, p_zalo_msg_id text default null, p_error text default null)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_msg public.zalo_messages;
begin
  select * into v_msg from public.zalo_messages where id = p_message_id and mode = 'auto' and status = 'sending' for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if p_ok then
    update public.zalo_messages set status = 'sent', zalo_msg_id = left(p_zalo_msg_id, 80) where id = v_msg.id;
  else
    update public.zalo_messages set status = 'failed', error = left(coalesce(p_error, 'error'), 200) where id = v_msg.id;
    update public.zalo_quota
       set sent = greatest(sent - 1, 0), next_allowed_at = null
     where staff_id = v_msg.staff_id and day = (v_msg.created_at at time zone 'Asia/Ho_Chi_Minh')::date;
  end if;
end;
$$;
comment on function public.finish_zalo_auto(uuid, boolean, text, text) is
  'Edge Function zalo-send: ghi kết quả gửi (sent / failed); failed hoàn lượt hạn mức. Chỉ service role.';
revoke execute on function public.finish_zalo_auto(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.finish_zalo_auto(uuid, boolean, text, text) to service_role;
