-- Sửa kiểm duyệt (phát hiện khi làm /admin/moderation):
-- 1. Moderator từ chối tin → review_listing đổi status listings → trg_listings_queue chèn thêm một dòng hàng chờ
--    'rejected' không người duyệt (hiện như "hệ thống tự từ chối") → tin hiện 2 lần ở tab Đã từ chối / lịch sử.
--    Sửa: hàng chờ chỉ ghi khi thay đổi đến từ người dùng (kiểm duyệt tự động), không ghi khi staff / server đổi.
-- 2. Thông báo từ chối thiếu lý do: params thêm 'reason' (mã trước dấu ':' trong ghi chú, vd 'scam').
-- Client: không đổi hợp đồng hàm; notification.params có thêm khoá reason (tuỳ chọn).

create or replace function public.trg_listings_queue()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- staff (review_listing, sửa tay) và service role / cron không tạo dòng hàng chờ mới
  if coalesce(current_setting('role', true), 'none') not in ('anon', 'authenticated') or public.is_staff() then
    return null;
  end if;
  if new.status in ('pending_review', 'rejected') and cardinality(new.moderation_reasons) > 0
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.moderation_queue (listing_id, reasons, risk_score, status)
    values (new.id, new.moderation_reasons, cardinality(new.moderation_reasons) * 10,
            case when new.status = 'rejected' then 'rejected' else 'pending' end)
    on conflict (listing_id) where status = 'pending'
      do update set reasons = excluded.reasons, risk_score = excluded.risk_score, updated_at = now();
  end if;
  return null;
end;
$$;

create or replace function public.review_listing(p_listing_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.listings;
begin
  if v_uid is null or not public.is_staff() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  select * into v_listing from public.listings where id = p_listing_id and deleted_at is null for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_listing.status not in ('pending_review', 'rejected') then
    raise exception using errcode = 'P0001', message = 'conflict', detail = 'review_listing: tin không ở trạng thái chờ duyệt';
  end if;

  update public.listings
  set status = case when p_approve then 'active'::public.listing_status else 'rejected'::public.listing_status end,
      expires_at = case when p_approve then greatest(expires_at, now() + public.listing_default_ttl(category)) else expires_at end
  where id = p_listing_id;

  update public.moderation_queue
  set status = case when p_approve then 'approved' else 'rejected' end, reviewed_by = v_uid, reviewed_at = now(),
      note = left(p_note, 500)
  where listing_id = p_listing_id and status = 'pending';

  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (v_uid, case when p_approve then 'listing.approve' else 'listing.reject' end, 'listing', p_listing_id::text,
          jsonb_build_object('note', left(p_note, 500), 'reasons', v_listing.moderation_reasons));

  insert into public.notifications (user_id, type, title_key, body_key, params, data)
  values (v_listing.owner_id,
          case when p_approve then 'listing_approved' else 'listing_rejected' end,
          case when p_approve then 'listing_approved.title' else 'listing_rejected.title' end,   -- khoá trong ns push
          case when p_approve then 'listing_approved.body' else 'listing_rejected.body' end,
          -- reason = mã lý do (phần trước ':' của ghi chú, vd 'scam') để client hiện lý do từ chối
          jsonb_build_object('title', v_listing.title, 'reason', nullif(split_part(coalesce(p_note, ''), ':', 1), '')),
          jsonb_build_object('screen', 'listing', 'params', jsonb_build_object('id', p_listing_id)));
end;
$$;
