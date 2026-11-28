-- Nhắn Zalo bán tự động cho staff (admin web): staff soạn tin cho lead / người dùng → DB ghi nhận + trừ hạn mức + audit →
-- web trả link zalo.me/SĐT, staff dán tin và bấm Gửi trong Zalo (không gửi tự động, không dịch vụ ngoài, không secret).
-- Port từ cskh-dlbd (ZaloQuotaService::reserve): mỗi staff mỗi ngày có hạn mức chọn ngẫu nhiên trong [15, 30] tin, giữa 2 tin
-- phải nghỉ ngẫu nhiên [60, 180] giây — để tài khoản Zalo cá nhân của staff không bị Zalo hạn chế. Giờ tính theo ngày VN.
--
-- Bảng: zalo_quota (hạn mức, chỉ RPC definer), zalo_messages (nhật ký, staff đọc).
-- RPC: zalo_status(), reserve_zalo_message(target_type, target_id, kind, content). Không lưu SĐT vào nhật ký / audit: SĐT
-- được tra từ lead / hồ sơ ngay trong RPC và chỉ trả về qua link zalo.me cho staff đã được ghi `audit_log zalo.send`.
-- Client: @hp/core zalo.ts (getZaloStatus, reserveZaloMessage, listZaloMessages), Zod ở @hp/shared schemas/zalo.ts
-- (ZALO_LIMITS khớp các hằng bên dưới), giao diện: hộp thoại "Nhắn Zalo" ở /admin/leads và /admin/users/[id].
--
-- | Vai trò           | zalo_status | reserve_zalo_message | select zalo_messages | zalo_quota |
-- |-------------------|-------------|----------------------|----------------------|------------|
-- | anon              | –           | –                    | –                    | –          |
-- | user / bị cấm     | forbidden   | forbidden            | không thấy dòng nào  | –          |
-- | moderator, admin  | được        | được (audit)         | được                 | –          |

-- ═════════════════════════════════════════════════════════════════════════════
-- zalo_quota: hạn mức theo ngày của từng staff. Không policy, không grant → chỉ RPC security definer đọc / ghi.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.zalo_quota (
  staff_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  quota int not null check (quota between 1 and 200),
  sent int not null default 0 check (sent >= 0),
  last_sent_at timestamptz,
  next_allowed_at timestamptz,
  primary key (staff_id, day)
);
comment on table public.zalo_quota is
  'Hạn mức nhắn Zalo theo ngày VN của từng staff (quota ngẫu nhiên [15, 30] — ZALO_LIMITS ở @hp/shared). Chỉ RPC definer ghi / đọc.';
alter table public.zalo_quota enable row level security;

-- ═════════════════════════════════════════════════════════════════════════════
-- zalo_messages: nhật ký tin đã ghi nhận. Không chứa SĐT (tra từ lead / hồ sơ khi cần). Chỉ RPC ghi.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.zalo_messages (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('lead', 'user')),
  target_id uuid not null,
  kind text not null check (kind in ('lead_reply', 'listing_notice', 'warning', 'custom')),
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
comment on table public.zalo_messages is
  'Nhật ký tin Zalo staff đã ghi nhận (bán tự động: staff tự dán và gửi trong Zalo). target_id = marketing_leads.id hoặc profiles.id theo target_type.';
create index zalo_messages_target_idx on public.zalo_messages (target_type, target_id, created_at desc);
create index zalo_messages_staff_idx on public.zalo_messages (staff_id, created_at desc);
alter table public.zalo_messages enable row level security;
grant select on public.zalo_messages to authenticated;   -- policy chỉ cho staff; ghi qua RPC
create policy zalo_messages_select_staff on public.zalo_messages for select to authenticated
  using ((select public.is_staff()));

-- ═════════════════════════════════════════════════════════════════════════════
-- Hàm nội bộ (không cấp cho client): dòng hạn mức hôm nay + trạng thái để hiển thị.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.zalo_today(p_staff uuid)
returns public.zalo_quota
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_row public.zalo_quota;
begin
  -- ZALO_LIMITS.dailyMin / dailyMax: 15 + [0, 15] = 15..30; trùng khoá (2 request cùng lúc) → dùng dòng đã có.
  insert into public.zalo_quota (staff_id, day, quota)
  values (p_staff, v_day, 15 + floor(random() * 16)::int)
  on conflict (staff_id, day) do nothing;
  select * into v_row from public.zalo_quota where staff_id = p_staff and day = v_day;
  return v_row;
end;
$$;
revoke execute on function public.zalo_today(uuid) from public, anon, authenticated;

create function public.zalo_present(p_row public.zalo_quota)
returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'quota', p_row.quota,
    'sent', p_row.sent,
    'remaining', greatest(0, p_row.quota - p_row.sent),
    'wait_seconds', case when p_row.next_allowed_at is not null and p_row.next_allowed_at > now()
                         then ceil(extract(epoch from (p_row.next_allowed_at - now())))::int else 0 end,
    'next_allowed_at', p_row.next_allowed_at,
    'can_send', p_row.sent < p_row.quota and (p_row.next_allowed_at is null or p_row.next_allowed_at <= now()),
    'reason', case
                when p_row.sent >= p_row.quota then 'limit_reached'
                when p_row.next_allowed_at is not null and p_row.next_allowed_at > now() then 'waiting'
                else null end
  );
$$;
revoke execute on function public.zalo_present(public.zalo_quota) from public, anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- zalo_status — hạn mức hôm nay của staff đang đăng nhập (tạo hạn mức ngày nếu chưa có).
-- ═════════════════════════════════════════════════════════════════════════════
create function public.zalo_status()
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return public.zalo_present(public.zalo_today(auth.uid()));
end;
$$;
comment on function public.zalo_status() is
  'Hạn mức nhắn Zalo hôm nay của staff: quota, sent, remaining, wait_seconds, can_send, reason (limit_reached | waiting | null).';
revoke execute on function public.zalo_status() from public, anon;
grant execute on function public.zalo_status() to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- reserve_zalo_message — ghi nhận 1 tin (trừ hạn mức) rồi trả link zalo.me tới SĐT của đối tượng.
--   Hết lượt / đang nghỉ → {ok: false, reason, status} (không raise, để UI hiện đếm ngược); không có dòng nào ghi.
--   Lỗi P0001: invalid_input, not_found (lead / người dùng không có hoặc đã xoá), no_phone (lead là email / người dùng đăng nhập Google).
-- ═════════════════════════════════════════════════════════════════════════════
create function public.reserve_zalo_message(p_target_type text, p_target_id uuid, p_kind text, p_content text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
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
  if not public.is_staff() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_target_type is null or p_target_type not in ('lead', 'user')
     or p_kind is null or p_kind not in ('lead_reply', 'listing_notice', 'warning', 'custom')
     or p_target_id is null or char_length(v_content) not between 1 and 2000 then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'reserve_zalo_message';
  end if;

  -- SĐT tra ở đây (không nhận từ client): lead = contact kiểu phone, người dùng = profiles.phone.
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

  -- Khoá dòng hạn mức: hai tin cùng lúc không vượt hạn mức hay bỏ qua thời gian nghỉ.
  perform public.zalo_today(v_uid);
  select * into v_row from public.zalo_quota
   where staff_id = v_uid and day = (now() at time zone 'Asia/Ho_Chi_Minh')::date for update;
  v_status := public.zalo_present(v_row);
  if not (v_status ->> 'can_send')::boolean then
    return jsonb_build_object('ok', false, 'reason', v_status ->> 'reason', 'status', v_status);
  end if;

  insert into public.zalo_messages (staff_id, target_type, target_id, kind, content)
  values (v_uid, p_target_type, p_target_id, p_kind, v_content)
  returning id into v_msg;

  -- ZALO_LIMITS.delayMin / delayMax: nghỉ ngẫu nhiên 60..180 giây trước tin kế tiếp.
  v_delay := 60 + floor(random() * 121)::int;
  update public.zalo_quota
     set sent = sent + 1, last_sent_at = v_now, next_allowed_at = v_now + make_interval(secs => v_delay)
   where staff_id = v_row.staff_id and day = v_row.day
  returning * into v_row;

  -- Audit không chép SĐT / nội dung tin (PII); chỉ loại tin.
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (v_uid, 'zalo.send', case p_target_type when 'lead' then 'lead' else 'profile' end, p_target_id::text,
          jsonb_build_object('kind', p_kind));

  return jsonb_build_object(
    'ok', true,
    'message_id', v_msg,
    'zalo_url', 'https://zalo.me/0' || substr(v_phone, 3),   -- 84912345678 → 0912345678
    'status', public.zalo_present(v_row)
  );
end;
$$;
comment on function public.reserve_zalo_message(text, uuid, text, text) is
  'Staff ghi nhận 1 tin Zalo bán tự động: kiểm hạn mức + nghỉ giữa 2 tin, ghi zalo_messages + audit zalo.send, trả zalo_url. ok=false khi hết lượt / đang nghỉ.';
revoke execute on function public.reserve_zalo_message(text, uuid, text, text) from public, anon;
grant execute on function public.reserve_zalo_message(text, uuid, text, text) to authenticated;
