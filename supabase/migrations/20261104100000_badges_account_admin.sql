-- Tuần 10: huy hiệu (giấy tờ riêng tư), xoá tài khoản (Nghị định 13), cache bản dịch, quản trị (số liệu, thao tác staff
-- có audit, xuất audit), cron dọn file.
-- Mục đích:
--   1. Bucket `verification` (riêng tư 5 MB) + policy; RPC request_badge_tx (gọi qua Edge Function request-badge);
--      duyệt / từ chối → audit badge.approve | badge.reject + thông báo 'system' cho người xin.
--   2. delete_my_account(): xoá mềm ngay (ẩn mọi nội dung qua view), huỷ nhóm mình tạo, rời nhóm, bỏ push token.
--      Xoá cứng sau 30 ngày: Edge Function purge-files (cron hằng ngày) xoá file Storage + auth user (cascade).
--   3. listing_translations: tiêu đề / mô tả đổi → xoá bản dịch cũ (translate-content dịch lại khi cần).
--   4. Quản trị: admin_stats(); staff_set_listing_status / staff_set_group_status (audit); audit tự động khi staff đổi
--      vai trò / cấm / khoá tạm / huy hiệu của người dùng và khi admin sửa từ khoá cấm; export_audit_log (admin, audit).
--   5. groups.host_id on delete cascade (xoá cứng tài khoản kéo theo nhóm đã tạo).
-- Client: @hp/core badges.ts, account (deleteMyAccount), admin.ts (adminStats, staff*, exportAuditLog), functions.ts
--   (requestBadge, translateContent); i18n push.badge_*, errors.*.
--
-- Ma trận quyền
-- | Vai trò   | verification (storage)  | request_badge_tx | delete_my_account | admin_stats / staff_* | export_audit_log |
-- |-----------|-------------------------|------------------|-------------------|-----------------------|------------------|
-- | anon      | –                       | –                | –                 | –                     | –                |
-- | user      | ghi / đọc thư mục mình  | có (3 / ngày)    | có                | –                     | –                |
-- | bị cấm    | đọc thư mục mình        | không            | có                | –                     | –                |
-- | moderator | đọc tất cả              | có               | có                | có                    | –                |
-- | admin     | đọc tất cả              | có               | có                | có                    | có               |

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. Huy hiệu
-- ═════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification', 'verification', false, 5 * 1024 * 1024, array['image/webp', 'image/jpeg', 'application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path {user_id}/{badge}/{timestamp}.{webp|jpg|pdf}. Không ghi đè / xoá từ client (purge-files dọn sau 30 ngày).
create policy verification_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'verification' and (storage.foldername(name))[1] = (select auth.uid())::text
              and not (select public.is_banned()));
create policy verification_select_own_or_staff on storage.objects for select to authenticated
  using (bucket_id = 'verification'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_staff())));

alter table public.badge_requests alter column document_path drop not null;
alter table public.badge_requests add column document_purged_at timestamptz;
comment on column public.badge_requests.document_path is
  'Giấy tờ trong bucket verification ({user_id}/{badge}/…). purge-files xoá file 30 ngày sau khi duyệt → null.';

-- Gọi từ Edge Function request-badge bằng JWT người gọi. Lỗi P0001: auth_required, banned, invalid_input,
-- document_missing, badge_owned, already_requested, rate_limited.
create function public.request_badge_tx(p_badge text, p_document_path text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if public.is_banned() then
    raise exception using errcode = 'P0001', message = 'banned';
  end if;
  if p_badge not in ('worker', 'landlord', 'venue', 'employer')
     or p_document_path is null
     or p_document_path !~ ('^' || v_uid::text || '/' || p_badge || '/[0-9]{10,16}\.(webp|jpg|pdf)$') then
    raise exception using errcode = 'P0001', message = 'invalid_input';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'verification' and name = p_document_path) then
    raise exception using errcode = 'P0001', message = 'document_missing';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and p_badge = any (badges)) then
    raise exception using errcode = 'P0001', message = 'badge_owned';
  end if;
  if exists (select 1 from public.badge_requests where user_id = v_uid and badge = p_badge and status = 'pending') then
    raise exception using errcode = 'P0001', message = 'already_requested';
  end if;
  perform public.assert_rate_limit(v_uid::text, 'request_badge', 3, 86400);   -- RATE_LIMITS.badgeRequestsPerDay
  insert into public.badge_requests (user_id, badge, document_path) values (v_uid, p_badge, p_document_path)
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.request_badge_tx(text, text) is 'Xin huy hiệu (giấy tờ đã upload vào verification). Gọi qua Edge Function request-badge.';
revoke execute on function public.request_badge_tx(text, text) from public, anon;
grant execute on function public.request_badge_tx(text, text) to authenticated;

-- Staff duyệt / từ chối → audit + thông báo (type system, khoá ns push badge_approved / badge_rejected).
create function public.trg_badge_requests_after_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    insert into public.audit_log (actor_id, action, target_type, target_id, meta)
    values (auth.uid(), case new.status when 'approved' then 'badge.approve' else 'badge.reject' end,
            'badge_request', new.id::text,
            jsonb_build_object('user_id', new.user_id, 'badge', new.badge, 'reason', new.reject_reason));
    insert into public.notifications (user_id, type, title_key, body_key, params)
    values (new.user_id, 'system',
            case new.status when 'approved' then 'badge_approved.title' else 'badge_rejected.title' end,
            case new.status when 'approved' then 'badge_approved.body' else 'badge_rejected.body' end,
            jsonb_build_object('badge', new.badge, 'reason', coalesce(new.reject_reason, '')));
  end if;
  return null;
end;
$$;
revoke execute on function public.trg_badge_requests_after_review() from public, anon, authenticated;
create trigger trg_badge_requests_after_review after update on public.badge_requests
  for each row execute function public.trg_badge_requests_after_review();

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. Xoá tài khoản
-- ═════════════════════════════════════════════════════════════════════════════
-- audit_log vẫn chỉ thêm, trừ một trường hợp: xoá cứng tài khoản → FK on delete set null ẩn danh hoá actor_id
-- (không phải client: FK chạy với quyền owner; mọi cột khác giữ nguyên).
create or replace function public.trg_audit_log_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and current_user not in ('anon', 'authenticated')
     and old.actor_id is not null and new.actor_id is null
     and (new.id, new.action, new.target_type, new.target_id, new.meta, new.created_at)
         is not distinct from (old.id, old.action, old.target_type, old.target_id, old.meta, old.created_at) then
    return new;
  end if;
  raise exception using errcode = '42501', message = 'forbidden', detail = 'audit_log chỉ được thêm';
end;
$$;

alter table public.groups drop constraint groups_host_id_fkey;
alter table public.groups add constraint groups_host_id_fkey
  foreign key (host_id) references public.profiles (id) on delete cascade;

-- Xoá mềm ngay: profiles.deleted_at (mọi view công khai đã lọc → tin / nhóm / hồ sơ biến mất), bỏ push token,
-- huỷ nhóm mình tạo còn mở (thành viên nhận group_cancelled), rời các nhóm đang tham gia. Đăng nhập lại bị coi như
-- bị cấm (is_banned tính deleted_at). Xoá cứng sau 30 ngày (purge-files). Audit account.delete.
create function public.delete_my_account()
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  update public.groups set status = 'cancelled'
  where host_id = v_uid and status in ('open', 'full') and deleted_at is null;
  update public.group_members set status = 'left'
  where user_id = v_uid and status in ('requested', 'accepted');
  update public.profiles set deleted_at = now(), push_tokens = '{}'
  where id = v_uid and deleted_at is null;
  insert into public.audit_log (actor_id, action, target_type, target_id) values (v_uid, 'account.delete', 'profile', v_uid::text);
end;
$$;
comment on function public.delete_my_account() is 'Người dùng tự xoá tài khoản (xoá mềm ngay, xoá cứng sau 30 ngày bằng purge-files).';
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. Bản dịch: tiêu đề / mô tả đổi → bỏ cache.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.trg_listings_clear_translations()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.title, new.description) is distinct from (old.title, old.description) then
    delete from public.listing_translations where listing_id = new.id;
  end if;
  return null;
end;
$$;
revoke execute on function public.trg_listings_clear_translations() from public, anon, authenticated;
create trigger trg_listings_clear_translations after update on public.listings
  for each row execute function public.trg_listings_clear_translations();

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. Quản trị
-- ═════════════════════════════════════════════════════════════════════════════
-- Số liệu dashboard (staff). Chưa tách web / app (chưa ghi nguồn tạo nội dung) — tuần 11.
create function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles where deleted_at is null),
    'users_new_7d', (select count(*) from public.profiles where deleted_at is null and created_at > now() - interval '7 days'),
    'users_banned', (select count(*) from public.profiles
                     where deleted_at is null and (is_banned or (banned_until is not null and banned_until > now()))),
    'listings_active', (select count(*) from public.listings
                        where status = 'active' and deleted_at is null and (expires_at is null or expires_at > now())),
    'listings_new_7d', (select count(*) from public.listings where deleted_at is null and created_at > now() - interval '7 days'),
    'listings_by_category', (select coalesce(jsonb_object_agg(category, n), '{}') from (
        select category::text, count(*) as n from public.listings
        where status = 'active' and deleted_at is null group by category) c),
    'groups_upcoming', (select count(*) from public.groups where status in ('open', 'full') and deleted_at is null and starts_at > now()),
    'groups_new_7d', (select count(*) from public.groups where deleted_at is null and created_at > now() - interval '7 days'),
    'messages_24h', (select count(*) from public.messages where created_at > now() - interval '24 hours'),
    'moderation_pending', (select count(*) from public.moderation_queue where status = 'pending'),
    'reports_open', (select count(*) from public.reports where status in ('open', 'reviewing')),
    'badges_pending', (select count(*) from public.badge_requests where status = 'pending'),
    'venues_pending', (select count(*) from public.venues where status = 'pending' and deleted_at is null)
  );
end;
$$;
comment on function public.admin_stats() is 'Số liệu dashboard /admin (staff).';
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- Staff ẩn / mở lại tin (ngoài hàng chờ duyệt). p_status: closed (ẩn) | active (mở lại) | rejected. Audit listing.status.
create function public.staff_set_listing_status(p_listing_id uuid, p_status public.listing_status, p_note text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_old public.listing_status;
begin
  if not public.is_staff() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_status not in ('active', 'closed', 'rejected') then
    raise exception using errcode = 'P0001', message = 'invalid_input';
  end if;
  select status into v_old from public.listings where id = p_listing_id and deleted_at is null for update;
  if v_old is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  update public.listings set status = p_status where id = p_listing_id;
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), 'listing.status', 'listing', p_listing_id::text,
          jsonb_build_object('from', v_old, 'to', p_status, 'note', left(p_note, 500)));
end;
$$;
revoke execute on function public.staff_set_listing_status(uuid, public.listing_status, text) from public, anon;
grant execute on function public.staff_set_listing_status(uuid, public.listing_status, text) to authenticated;

-- Staff huỷ nhóm vi phạm (thành viên nhận group_cancelled). Audit group.cancel.
create function public.staff_cancel_group(p_group_id uuid, p_note text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_old public.group_status;
begin
  if not public.is_staff() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  select status into v_old from public.groups where id = p_group_id and deleted_at is null for update;
  if v_old is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_old in ('completed', 'cancelled') then
    raise exception using errcode = 'P0001', message = 'group_closed';
  end if;
  update public.groups set status = 'cancelled' where id = p_group_id;
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), 'group.cancel', 'group', p_group_id::text, jsonb_build_object('from', v_old, 'note', left(p_note, 500)));
end;
$$;
revoke execute on function public.staff_cancel_group(uuid, text) from public, anon;
grant execute on function public.staff_cancel_group(uuid, text) to authenticated;

-- Audit khi staff đổi vai trò / cấm / khoá tạm / huy hiệu của người dùng (guard đã giới hạn ai được đổi gì).
create function public.trg_profiles_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or v_actor = new.id then
    return null;
  end if;
  if new.role is distinct from old.role then
    insert into public.audit_log (actor_id, action, target_type, target_id, meta)
    values (v_actor, 'user.role', 'profile', new.id::text, jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  if new.is_banned is distinct from old.is_banned then
    insert into public.audit_log (actor_id, action, target_type, target_id)
    values (v_actor, case when new.is_banned then 'user.ban' else 'user.unban' end, 'profile', new.id::text);
  end if;
  if new.banned_until is distinct from old.banned_until then
    insert into public.audit_log (actor_id, action, target_type, target_id, meta)
    values (v_actor, case when new.banned_until is null then 'user.unsuspend' else 'user.suspend' end, 'profile', new.id::text,
            jsonb_build_object('until', new.banned_until));
  end if;
  if new.badges is distinct from old.badges then
    insert into public.audit_log (actor_id, action, target_type, target_id, meta)
    values (v_actor, 'user.badges', 'profile', new.id::text, jsonb_build_object('from', old.badges, 'to', new.badges));
  end if;
  return null;
end;
$$;
revoke execute on function public.trg_profiles_audit() from public, anon, authenticated;
create trigger trg_profiles_audit after update on public.profiles
  for each row execute function public.trg_profiles_audit();

-- Audit từ khoá cấm (admin ghi qua PostgREST).
create function public.trg_banned_keywords_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row public.banned_keywords := coalesce(new, old);
begin
  if auth.uid() is null then
    return null;
  end if;
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), 'keyword.' || lower(tg_op), 'banned_keyword', v_row.id::text,
          jsonb_build_object('keyword', v_row.keyword, 'action', v_row.action));
  return null;
end;
$$;
revoke execute on function public.trg_banned_keywords_audit() from public, anon, authenticated;
create trigger trg_banned_keywords_audit after insert or update or delete on public.banned_keywords
  for each row execute function public.trg_banned_keywords_audit();

-- Xuất audit (admin): lọc khoảng ngày / tiền tố hành động, ≤ 10.000 dòng, mới nhất trước. Ghi audit.export.
create function public.export_audit_log(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_action_prefix text default null,
  p_limit int default 5000
)
returns table (id bigint, created_at timestamptz, actor_id uuid, actor_name text, action text, target_type text,
               target_id text, meta jsonb)
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  insert into public.audit_log (actor_id, action, target_type, meta)
  values (auth.uid(), 'audit.export', 'audit_log',
          jsonb_build_object('from', p_from, 'to', p_to, 'action', p_action_prefix));
  return query
    select a.id, a.created_at, a.actor_id, public.short_name(p.full_name), a.action, a.target_type, a.target_id, a.meta
    from public.audit_log a
    left join public.profiles p on p.id = a.actor_id
    where (p_from is null or a.created_at >= p_from)
      and (p_to is null or a.created_at < p_to)
      and (p_action_prefix is null or a.action like replace(p_action_prefix, '%', '') || '%')
    order by a.created_at desc, a.id desc
    limit least(greatest(coalesce(p_limit, 5000), 1), 10000);
end;
$$;
comment on function public.export_audit_log(timestamptz, timestamptz, text, int) is 'Xuất audit_log cho admin (CSV ở web), ghi audit.export.';
revoke execute on function public.export_audit_log(timestamptz, timestamptz, text, int) from public, anon;
grant execute on function public.export_audit_log(timestamptz, timestamptz, text, int) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. Cron dọn file: 03:30 giờ VN (20:30 UTC) gọi Edge Function purge-files (giấy tờ 30 ngày sau duyệt, tài khoản xoá
-- mềm quá 30 ngày). Chưa cấu hình functions_url / cron_secret → bỏ qua.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.call_purge_files()
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_url text := public.app_setting('functions_url');
  v_secret text := public.app_setting('cron_secret');
begin
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url || '/purge-files',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret)
  );
end;
$$;
revoke execute on function public.call_purge_files() from public, anon, authenticated;
select cron.schedule('purge-files', '30 20 * * *', $$select public.call_purge_files()$$);
