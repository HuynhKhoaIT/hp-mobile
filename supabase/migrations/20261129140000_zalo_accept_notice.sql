-- Tự động báo Zalo cho KHÁCH và THỢ khi khách chốt báo giá (service_requests: open → assigned), bằng Zalo CSKH do admin chọn
-- trong /admin/zalo-settings (cấu hình, không phải mã cứng).
--
-- zalo_settings: + auto_sender_id (tài khoản Zalo đã kết nối của staff làm "Zalo CSKH") + notify_accepted (công tắc, mặc định TẮT).
-- Loại tin mới: accepted_customer (báo khách đã chốt thợ), accepted_pro (báo thợ báo giá đã được chọn); mẫu sửa được ở zalo_templates.
-- Luồng: trigger after update trên service_requests → pg_net POST Edge Function zalo-notify (x-webhook-secret) → function tra
-- zalo_accept_targets, gọi reserve_zalo_notice cho từng người, gửi bằng zca-js, finish_zalo_auto. Lỗi gửi chỉ ghi nhật ký
-- (zalo_messages.status = failed), không ảnh hưởng việc chốt báo giá.
-- Hạn mức: tin báo TÍNH vào hạn mức ngày của tài khoản gửi (dùng chung với staff nhắn tay) nhưng KHÔNG bị chặn bởi thời gian nghỉ
-- giữa 2 tin (mỗi lần chốt cần gửi 2 tin liên tiếp). Hết lượt → ghi tin failed 'limit_reached', không gửi.
--
-- Quyền:
--   anon / user / bị cấm → RPC 42501; moderator → đọc cấu hình (RLS staff), RPC admin 42501
--   admin                → save_zalo_auto, zalo_sender_options (audit zalo.settings)
--   service role         → zalo_accept_targets, reserve_zalo_notice (Edge Function zalo-notify)

-- ═════════════════════════════════════════════════════════════════════════════
-- Cấu hình
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.zalo_settings
  add column auto_sender_id uuid references public.zalo_accounts (staff_id) on delete set null,
  add column notify_accepted boolean not null default false;
comment on column public.zalo_settings.auto_sender_id is 'Staff có Zalo đã kết nối dùng làm Zalo CSKH gửi tin báo tự động (null = chưa chọn).';
comment on column public.zalo_settings.notify_accepted is 'Bật: khi khách chốt báo giá, tự nhắn Zalo cho khách và thợ bằng tài khoản auto_sender_id.';

alter table public.zalo_messages drop constraint zalo_messages_kind_check;
alter table public.zalo_messages add constraint zalo_messages_kind_check
  check (kind in ('lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request', 'accepted_customer', 'accepted_pro'));
alter table public.zalo_templates drop constraint zalo_templates_kind_check;
alter table public.zalo_templates add constraint zalo_templates_kind_check
  check (kind in ('lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request', 'accepted_customer', 'accepted_pro'));

-- ═════════════════════════════════════════════════════════════════════════════
-- RPC admin
-- ═════════════════════════════════════════════════════════════════════════════
create function public.save_zalo_auto(p_enabled boolean, p_sender uuid default null)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_enabled is null or (p_enabled and p_sender is null) then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'save_zalo_auto';
  end if;
  if p_sender is not null and not exists (
    select 1 from public.zalo_accounts a where a.staff_id = p_sender and a.status = 'connected' and public.zalo_is_staff(p_sender)
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'save_zalo_auto';
  end if;
  update public.zalo_settings
     set auto_sender_id = p_sender, notify_accepted = p_enabled, updated_by = v_uid, updated_at = now()
   where id;
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (v_uid, 'zalo.settings', 'zalo_settings', 'default',
          jsonb_build_object('notify_accepted', p_enabled, 'has_sender', p_sender is not null));
end;
$$;
comment on function public.save_zalo_auto(boolean, uuid) is
  'Admin: chọn Zalo CSKH (tài khoản đã kết nối) + bật / tắt tự báo khi chốt báo giá. Audit zalo.settings. P0001 invalid_input, 42501 forbidden.';
revoke execute on function public.save_zalo_auto(boolean, uuid) from public, anon;
grant execute on function public.save_zalo_auto(boolean, uuid) to authenticated;

-- Danh sách tài khoản Zalo đã kết nối của mọi staff để admin chọn Zalo CSKH (RLS chỉ cho staff xem tài khoản của mình).
create function public.zalo_sender_options()
returns table (staff_id uuid, display_name text, staff_name text, status text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return query
    select a.staff_id, a.display_name, p.full_name, a.status
    from public.zalo_accounts a
    join public.profiles p on p.id = a.staff_id
    order by a.connected_at;
end;
$$;
comment on function public.zalo_sender_options() is
  'Admin: các tài khoản Zalo đã kết nối (staff_id, tên Zalo, tên staff, trạng thái) để chọn Zalo CSKH. Không trả phiên / SĐT.';
revoke execute on function public.zalo_sender_options() from public, anon;
grant execute on function public.zalo_sender_options() to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Hàm cho Edge Function zalo-notify (chỉ service role)
-- ═════════════════════════════════════════════════════════════════════════════
-- Tên gọi ngắn (từ cuối của họ tên: "Nguyễn Huỳnh Khoa" → "Khoa").
create function public.zalo_short_name(p_user uuid)
returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(regexp_replace(btrim(coalesce(p.full_name, '')), '^.*\s', ''), ''), '')
  from public.profiles p where p.id = p_user;
$$;
revoke execute on function public.zalo_short_name(uuid) from public, anon, authenticated;

-- zalo_accept_targets: null = không cần gửi (tắt / chưa chọn Zalo CSKH / yêu cầu không ở trạng thái đã chốt).
create function public.zalo_accept_targets(p_request_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_s public.zalo_settings;
  v_r public.service_requests;
  v_q public.service_quotes;
begin
  select * into v_s from public.zalo_settings where id;
  if not found or not v_s.notify_accepted or v_s.auto_sender_id is null then
    return null;
  end if;
  select * into v_r from public.service_requests where id = p_request_id and deleted_at is null and status = 'assigned';
  if not found or v_r.accepted_quote_id is null then
    return null;
  end if;
  select * into v_q from public.service_quotes where id = v_r.accepted_quote_id;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'sender', v_s.auto_sender_id,
    'title', v_r.title,
    'customer', jsonb_build_object('id', v_r.customer_id, 'name', public.zalo_short_name(v_r.customer_id)),
    'pro', jsonb_build_object('id', v_q.pro_id, 'name', public.zalo_short_name(v_q.pro_id)),
    'templates', (select coalesce(jsonb_object_agg(t.kind, t.content), '{}'::jsonb)
                    from public.zalo_templates t where t.kind in ('accepted_customer', 'accepted_pro'))
  );
end;
$$;
comment on function public.zalo_accept_targets(uuid) is
  'Edge Function zalo-notify: người gửi, tiêu đề, khách, thợ được chọn + mẫu tuỳ chỉnh; null khi tắt / chưa chọn Zalo CSKH. Chỉ service role.';
revoke execute on function public.zalo_accept_targets(uuid) from public, anon, authenticated;
grant execute on function public.zalo_accept_targets(uuid) to service_role;

-- reserve_zalo_notice: như reserve_zalo_auto cho tin báo (đối tượng user) nhưng KHÔNG chờ thời gian nghỉ; vẫn tính vào hạn mức ngày.
-- Hết lượt → ghi tin failed 'limit_reached' (hiện ở Tin Zalo đã gửi) và trả { ok: false }.
create function public.reserve_zalo_notice(p_staff uuid, p_target_id uuid, p_kind text, p_content text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_content text := btrim(coalesce(p_content, ''));
  v_phone text;
  v_found boolean;
  v_row public.zalo_quota;
  v_msg uuid;
begin
  if p_staff is null or not public.zalo_is_staff(p_staff) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_kind is null or p_kind not in ('accepted_customer', 'accepted_pro')
     or p_target_id is null or char_length(v_content) not between 1 and 2000 then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'reserve_zalo_notice';
  end if;
  select phone into v_phone from public.profiles where id = p_target_id and deleted_at is null;
  v_found := found;
  if not v_found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_phone is null or v_phone !~ '^84[0-9]{8,10}$' then
    raise exception using errcode = 'P0001', message = 'no_phone';
  end if;

  perform public.zalo_today(p_staff);
  select * into v_row from public.zalo_quota
   where staff_id = p_staff and day = (now() at time zone 'Asia/Ho_Chi_Minh')::date for update;
  if v_row.sent >= v_row.quota then
    insert into public.zalo_messages (staff_id, target_type, target_id, kind, content, mode, status, error)
    values (p_staff, 'user', p_target_id, p_kind, v_content, 'auto', 'failed', 'limit_reached');
    return jsonb_build_object('ok', false, 'reason', 'limit_reached');
  end if;

  insert into public.zalo_messages (staff_id, target_type, target_id, kind, content, mode, status)
  values (p_staff, 'user', p_target_id, p_kind, v_content, 'auto', 'sending')
  returning id into v_msg;
  update public.zalo_quota set sent = sent + 1 where staff_id = v_row.staff_id and day = v_row.day;

  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (p_staff, 'zalo.send', 'profile', p_target_id::text, jsonb_build_object('kind', p_kind, 'mode', 'auto', 'notice', true));

  return jsonb_build_object('ok', true, 'message_id', v_msg, 'phone', v_phone);
end;
$$;
comment on function public.reserve_zalo_notice(uuid, uuid, text, text) is
  'Edge Function zalo-notify: ghi tin báo tự động (accepted_customer / accepted_pro), trừ hạn mức ngày, không chờ nghỉ; hết lượt → ghi failed. Chỉ service role.';
revoke execute on function public.reserve_zalo_notice(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.reserve_zalo_notice(uuid, uuid, text, text) to service_role;

-- ═════════════════════════════════════════════════════════════════════════════
-- Trigger: yêu cầu open → assigned → gọi zalo-notify (chỉ khi đã bật + chọn Zalo CSKH + đã cấu hình functions_url / webhook_secret)
-- ═════════════════════════════════════════════════════════════════════════════
create function public.trg_service_requests_zalo_notice()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url text := public.app_setting('functions_url');
  v_secret text := public.app_setting('webhook_secret');
begin
  if v_url is null or v_secret is null then
    return null;
  end if;
  if not exists (select 1 from public.zalo_settings s where s.id and s.notify_accepted and s.auto_sender_id is not null) then
    return null;
  end if;
  perform net.http_post(
    url := v_url || '/zalo-notify',
    body := jsonb_build_object('request_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret)
  );
  return null;
end;
$$;
revoke execute on function public.trg_service_requests_zalo_notice() from public, anon, authenticated;
create trigger trg_service_requests_zalo_notice after update of status on public.service_requests
  for each row when (old.status = 'open' and new.status = 'assigned')
  execute function public.trg_service_requests_zalo_notice();

-- ═════════════════════════════════════════════════════════════════════════════
-- Hàm cũ viết lại (create or replace) chỉ để thêm 2 loại tin mới vào danh sách hợp lệ; hành vi khác giữ nguyên.
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.save_zalo_template(p_kind text, p_content text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_content text := btrim(coalesce(p_content, ''));
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_kind is null or p_kind not in ('lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request', 'accepted_customer', 'accepted_pro')
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

create or replace function public.reset_zalo_template(p_kind text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_kind is null or p_kind not in ('lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request', 'accepted_customer', 'accepted_pro') then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'reset_zalo_template';
  end if;
  delete from public.zalo_templates where kind = p_kind;
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (v_uid, 'zalo.template', 'zalo_template', p_kind, jsonb_build_object('kind', p_kind, 'reset', true));
end;
$$;

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
     or p_kind is null or p_kind not in ('lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request', 'accepted_customer', 'accepted_pro')
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
     or p_kind is null or p_kind not in ('lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request', 'accepted_customer', 'accepted_pro')
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

