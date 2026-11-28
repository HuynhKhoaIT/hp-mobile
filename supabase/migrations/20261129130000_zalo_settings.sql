-- Cấu hình Zalo + mẫu tin do admin chỉnh trong /admin/zalo-settings.
--
-- 1. zalo_settings (1 dòng): hạn mức tin / ngày [daily_min, daily_max] và thời gian nghỉ giữa 2 tin [delay_min, delay_max] giây —
--    trước đây là hằng số trong SQL. Giới hạn an toàn bằng CHECK (daily_max ≤ 50, delay_min ≥ 30) để không cấu hình thành mức dễ
--    làm Zalo khoá tài khoản. Đổi cấu hình: lượt hôm nay của mọi staff được kẹp vào khoảng mới.
-- 2. zalo_templates: nội dung tin soạn sẵn theo loại tin (ghi đè bản mặc định trong i18n `admin.zalo.template.*`). Biến {{name}},
--    {{app}}, {{title}} được thay ở client. Không có dòng = dùng bản mặc định.
--
-- Hàm viết lại (create or replace, chỉ đổi cách chọn hạn mức / thời gian nghỉ, hành vi khác giữ nguyên): zalo_today,
-- reserve_zalo_message, reserve_zalo_auto.
--
-- Quyền:
--   anon                → select 42501, RPC 42501
--   user / bị cấm       → select 0 dòng, RPC 42501 forbidden
--   moderator           → đọc zalo_settings / zalo_templates; RPC ghi 42501 forbidden
--   admin               → đọc + save_zalo_settings / save_zalo_template / reset_zalo_template (audit zalo.settings / zalo.template)

-- ═════════════════════════════════════════════════════════════════════════════
-- zalo_settings
-- ═════════════════════════════════════════════════════════════════════════════
create table public.zalo_settings (
  id boolean primary key default true check (id),
  daily_min int not null default 15,
  daily_max int not null default 30,
  delay_min int not null default 60,
  delay_max int not null default 180,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint zalo_settings_daily check (daily_min >= 1 and daily_max >= daily_min and daily_max <= 50),
  constraint zalo_settings_delay check (delay_min >= 30 and delay_max >= delay_min and delay_max <= 900)
);
comment on table public.zalo_settings is
  'Cấu hình nhắn Zalo (1 dòng): hạn mức ngày [daily_min, daily_max], nghỉ giữa 2 tin [delay_min, delay_max] giây. Chỉ admin ghi qua save_zalo_settings.';
insert into public.zalo_settings default values;
alter table public.zalo_settings enable row level security;
grant select on public.zalo_settings to authenticated;
create policy zalo_settings_select_staff on public.zalo_settings for select to authenticated
  using ((select public.is_staff()));

-- ═════════════════════════════════════════════════════════════════════════════
-- zalo_templates
-- ═════════════════════════════════════════════════════════════════════════════
create table public.zalo_templates (
  kind text primary key check (kind in ('lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request')),
  content text not null check (char_length(content) between 1 and 2000),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
comment on table public.zalo_templates is
  'Mẫu tin Zalo theo loại tin (ghi đè bản mặc định ở i18n). Biến {{name}}, {{app}}, {{title}}. Chỉ admin ghi qua save_zalo_template / reset_zalo_template.';
alter table public.zalo_templates enable row level security;
grant select on public.zalo_templates to authenticated;
create policy zalo_templates_select_staff on public.zalo_templates for select to authenticated
  using ((select public.is_staff()));

-- ═════════════════════════════════════════════════════════════════════════════
-- RPC admin
-- ═════════════════════════════════════════════════════════════════════════════
create function public.save_zalo_settings(p_daily_min int, p_daily_max int, p_delay_min int, p_delay_max int)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_daily_min is null or p_daily_max is null or p_delay_min is null or p_delay_max is null
     or p_daily_min < 1 or p_daily_max < p_daily_min or p_daily_max > 50
     or p_delay_min < 30 or p_delay_max < p_delay_min or p_delay_max > 900 then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'save_zalo_settings';
  end if;
  update public.zalo_settings
     set daily_min = p_daily_min, daily_max = p_daily_max, delay_min = p_delay_min, delay_max = p_delay_max,
         updated_by = v_uid, updated_at = now()
   where id;
  -- Lượt hôm nay đã chọn theo cấu hình cũ: kẹp vào khoảng mới (hạ trần có hiệu lực ngay).
  update public.zalo_quota
     set quota = least(greatest(quota, p_daily_min), p_daily_max)
   where day = (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (v_uid, 'zalo.settings', 'zalo_settings', 'default',
          jsonb_build_object('daily_min', p_daily_min, 'daily_max', p_daily_max, 'delay_min', p_delay_min, 'delay_max', p_delay_max));
end;
$$;
comment on function public.save_zalo_settings(int, int, int, int) is
  'Admin: đặt hạn mức ngày [min, max] (1..50) và thời gian nghỉ [min, max] giây (30..900). Audit zalo.settings. P0001 invalid_input, 42501 forbidden.';
revoke execute on function public.save_zalo_settings(int, int, int, int) from public, anon;
grant execute on function public.save_zalo_settings(int, int, int, int) to authenticated;

create function public.save_zalo_template(p_kind text, p_content text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_content text := btrim(coalesce(p_content, ''));
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_kind is null or p_kind not in ('lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request')
     or char_length(v_content) not between 1 and 2000 then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'save_zalo_template';
  end if;
  insert into public.zalo_templates (kind, content, updated_by, updated_at)
  values (p_kind, v_content, v_uid, now())
  on conflict (kind) do update set content = excluded.content, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (v_uid, 'zalo.template', 'zalo_template', p_kind, jsonb_build_object('kind', p_kind));
end;
$$;
comment on function public.save_zalo_template(text, text) is
  'Admin: đặt mẫu tin Zalo cho một loại tin (1..2000 ký tự). Audit zalo.template (không chép nội dung). P0001 invalid_input, 42501 forbidden.';
revoke execute on function public.save_zalo_template(text, text) from public, anon;
grant execute on function public.save_zalo_template(text, text) to authenticated;

create function public.reset_zalo_template(p_kind text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_kind is null or p_kind not in ('lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request') then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'reset_zalo_template';
  end if;
  delete from public.zalo_templates where kind = p_kind;
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (v_uid, 'zalo.template', 'zalo_template', p_kind, jsonb_build_object('kind', p_kind, 'reset', true));
end;
$$;
comment on function public.reset_zalo_template(text) is
  'Admin: bỏ mẫu tuỳ chỉnh của một loại tin, quay về bản mặc định. Audit zalo.template {reset: true}.';
revoke execute on function public.reset_zalo_template(text) from public, anon;
grant execute on function public.reset_zalo_template(text) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Hàm nội bộ đọc cấu hình, và các hàm hạn mức viết lại để dùng cấu hình thay hằng số.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.zalo_random_daily()
returns int
language sql volatile security definer set search_path = '' as $$
  select s.daily_min + floor(random() * (s.daily_max - s.daily_min + 1))::int from public.zalo_settings s where s.id;
$$;
create function public.zalo_random_delay()
returns int
language sql volatile security definer set search_path = '' as $$
  select s.delay_min + floor(random() * (s.delay_max - s.delay_min + 1))::int from public.zalo_settings s where s.id;
$$;
revoke execute on function public.zalo_random_daily() from public, anon, authenticated;
revoke execute on function public.zalo_random_delay() from public, anon, authenticated;

create or replace function public.zalo_today(p_staff uuid)
returns public.zalo_quota
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_row public.zalo_quota;
begin
  -- Hạn mức ngày chọn ngẫu nhiên trong [daily_min, daily_max] của zalo_settings; trùng khoá (2 request cùng lúc) → dùng dòng đã có.
  insert into public.zalo_quota (staff_id, day, quota)
  values (p_staff, v_day, public.zalo_random_daily())
  on conflict (staff_id, day) do nothing;
  select * into v_row from public.zalo_quota where staff_id = p_staff and day = v_day;
  return v_row;
end;
$$;

-- reserve_zalo_message / reserve_zalo_auto: giữ nguyên, chỉ thời gian nghỉ lấy từ zalo_settings.

create or replace function public.reserve_zalo_message(p_target_type text, p_target_id uuid, p_kind text, p_content text)
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
     or p_kind is null or p_kind not in ('lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request')
     or p_target_id is null or char_length(v_content) not between 1 and 2000 then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'reserve_zalo_message';
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

  v_delay := public.zalo_random_delay();
  update public.zalo_quota
     set sent = sent + 1, last_sent_at = v_now, next_allowed_at = v_now + make_interval(secs => v_delay)
   where staff_id = v_row.staff_id and day = v_row.day
  returning * into v_row;

  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (v_uid, 'zalo.send', case p_target_type when 'lead' then 'lead' else 'profile' end, p_target_id::text,
          jsonb_build_object('kind', p_kind));

  return jsonb_build_object(
    'ok', true,
    'message_id', v_msg,
    'zalo_url', 'https://zalo.me/0' || substr(v_phone, 3),
    'status', public.zalo_present(v_row)
  );
end;
$$;

create or replace function public.reserve_zalo_auto(p_staff uuid, p_target_type text, p_target_id uuid, p_kind text, p_content text)
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

  v_delay := public.zalo_random_delay();
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
