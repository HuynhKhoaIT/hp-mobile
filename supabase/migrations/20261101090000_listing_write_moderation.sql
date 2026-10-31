-- Listing ghi + kiểm duyệt tự động (tuần 4)
-- Mục đích: đăng / sửa tin qua PostgREST + RLS (đã có từ 20261031110000); thêm giới hạn 10 tin / ngày, kiểm duyệt
--   tự động khi đăng / sửa, hàng chờ moderator, duyệt tin, gia hạn, hiện SĐT người đăng, thông báo duyệt / từ chối.
-- Bảng: banned_keywords, moderation_queue; cột listings.moderation_reasons (nội bộ, không vào public_listings).
-- RPC: review_listing (staff), renew_listing (chủ tin), reveal_contact (đăng nhập, 20 / giờ, audit).
-- Client: @hp/core listings-write.ts (createListing, updateListing, setListingStatus, renewListing, revealContact).
--
-- Kiểm duyệt nằm ở trigger (không Edge Function moderate-listing qua webhook): chạy đồng bộ trong transaction đăng tin
--   nên tin rủi ro không lộ lên public_listings dù chỉ vài giây, và test được bằng pgTAP. Luật cần dịch vụ ngoài
--   (ảnh trùng hash) sẽ là Edge Function riêng, chỉ thêm lý do vào hàng chờ (supabase/CLAUDE.md mục 6).
--
-- Ma trận quyền
-- | Vai trò     | banned_keywords | moderation_queue | review_listing | renew_listing | reveal_contact |
-- |-------------|-----------------|------------------|----------------|---------------|----------------|
-- | anon        | –               | –                | –              | –             | –              |
-- | user        | –               | –                | –              | tin của mình  | 20 / giờ       |
-- | bị cấm      | –               | –                | –              | –             | –              |
-- | moderator   | đọc             | đọc / sửa        | được           | –             | 20 / giờ       |
-- | admin       | đọc / ghi       | đọc / sửa        | được           | –             | 20 / giờ       |

-- ═════════════════════════════════════════════════════════════════════════════
-- banned_keywords — từ khoá kiểm duyệt (admin quản lý ở /admin/catalog)
--   action reject → tin bị từ chối ngay; review → vào hàng chờ. categories null = mọi category.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.banned_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null check (char_length(btrim(keyword)) between 2 and 60 and keyword !~ '[^[:alnum:] ]'),
  action text not null default 'review' check (action in ('reject', 'review')),
  categories public.listing_category[],
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index banned_keywords_keyword_idx on public.banned_keywords (public.f_unaccent(keyword));
alter table public.banned_keywords enable row level security;
grant select, insert, update, delete on public.banned_keywords to authenticated;
create trigger trg_banned_keywords_updated_at before update on public.banned_keywords
  for each row execute function public.set_updated_at();

create policy banned_keywords_select_staff on public.banned_keywords for select to authenticated
  using ((select public.is_staff()));
create policy banned_keywords_insert_admin on public.banned_keywords for insert to authenticated
  with check ((select public.is_admin()));
create policy banned_keywords_update_admin on public.banned_keywords for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy banned_keywords_delete_admin on public.banned_keywords for delete to authenticated
  using ((select public.is_admin()));

-- Bộ khởi đầu (mọi môi trường). Viết có dấu; so khớp sau khi bỏ dấu nên "dat coc truoc" cũng bắt được.
insert into public.banned_keywords (keyword, action, categories) values
  ('ma tuý', 'reject', null),
  ('ma túy', 'reject', null),
  ('cờ bạc', 'reject', null),
  ('cá độ', 'reject', null),
  ('vũ khí', 'reject', null),
  ('tín dụng đen', 'reject', null),
  ('vay nóng', 'review', null),
  ('việc nhẹ lương cao', 'review', null),
  ('chuyển khoản trước', 'review', null),
  ('đặt cọc trước', 'review', null),
  ('phí hồ sơ', 'review', array['job_main', 'job_parttime']::public.listing_category[]),
  ('phí giữ chỗ', 'review', array['job_main', 'job_parttime']::public.listing_category[]),
  ('nộp phí', 'review', array['job_main', 'job_parttime']::public.listing_category[]),
  ('đặt cọc', 'review', array['job_main', 'job_parttime']::public.listing_category[])
on conflict do nothing;

-- ═════════════════════════════════════════════════════════════════════════════
-- moderation_queue — hàng chờ moderator. Chỉ trigger / RPC ghi (security definer), staff đọc / xử lý.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.moderation_queue (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reasons text[] not null check (reasons <@ array['keyword', 'keyword_reject', 'new_account', 'low_price', 'image_dup', 'report']),
  risk_score int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index moderation_queue_pending_idx on public.moderation_queue (listing_id) where status = 'pending';
create index moderation_queue_status_idx on public.moderation_queue (status, created_at);
alter table public.moderation_queue enable row level security;
grant select, update (status, note) on public.moderation_queue to authenticated;
create trigger trg_moderation_queue_updated_at before update on public.moderation_queue
  for each row execute function public.set_updated_at();

create policy moderation_queue_select_staff on public.moderation_queue for select to authenticated
  using ((select public.is_staff()));
create policy moderation_queue_update_staff on public.moderation_queue for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- ═════════════════════════════════════════════════════════════════════════════
-- listings: lý do kiểm duyệt (nội bộ) + giới hạn tin / ngày + trigger kiểm duyệt
-- ═════════════════════════════════════════════════════════════════════════════
-- trg_listings_identity gọi gen_short_id / slugify / listing_default_ttl (đã thu quyền execute của user) → khi user
-- đăng tin thật sẽ lỗi "permission denied for function gen_short_id". pgTAP tuần 3 không bắt được vì plpgsql giữ
-- biểu thức đã khởi tạo từ lần chạy đầu bằng quyền postgres. Chạy trigger bằng quyền owner (chỉ tính cột của chính dòng).
alter function public.trg_listings_identity() security definer;

-- slug / short_id do trg_listings_identity sinh (BEFORE INSERT, trước CHECK): default rỗng để client không phải gửi
-- (type Insert sinh ra cho @hp/db thành optional). Giá trị client gửi luôn bị trigger ghi đè.
alter table public.listings alter column slug set default '', alter column short_id set default '';

alter table public.listings add column moderation_reasons text[] not null default '{}';
comment on column public.listings.moderation_reasons is 'Lý do kiểm duyệt tự động lần gần nhất (nội bộ, không vào public_listings).';

-- Guard cũ chặn chủ tin tự đổi cột server: thêm moderation_reasons (trigger kiểm duyệt đặt lại sau guard).
create or replace function public.trg_listings_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'active') then
      raise exception using errcode = '42501', message = 'forbidden', detail = 'listings: trạng thái khi đăng chỉ draft / active';
    end if;
    if new.view_count <> 0 or new.deleted_at is not null or cardinality(new.moderation_reasons) > 0 then
      raise exception using errcode = '42501', message = 'forbidden', detail = 'listings: cột chỉ server được đặt';
    end if;
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id
     or new.category is distinct from old.category
     or new.view_count is distinct from old.view_count
     or new.created_at is distinct from old.created_at
     or new.expires_at is distinct from old.expires_at
     or new.moderation_reasons is distinct from old.moderation_reasons then
    raise exception using errcode = '42501', message = 'forbidden', detail = 'listings: cột chỉ server được đổi';
  end if;

  if new.status is distinct from old.status then
    if new.status not in ('draft', 'active', 'sold', 'closed') then
      raise exception using errcode = '42501', message = 'forbidden', detail = 'listings: trạng thái chỉ server đặt';
    end if;
    if new.status = 'active' and old.status in ('pending_review', 'rejected', 'expired') then
      raise exception using errcode = '42501', message = 'forbidden', detail = 'listings: không tự mở lại tin chờ duyệt / bị từ chối / hết hạn';
    end if;
  end if;

  if old.deleted_at is not null then
    raise exception using errcode = '42501', message = 'forbidden', detail = 'listings: tin đã xoá';
  end if;
  return new;
end;
$$;

-- Kiểm duyệt tự động. Chạy sau guard / identity (tên trigger theo thứ tự chữ cái: guard < identity < moderate).
-- Chỉ với người dùng (staff, service role, seed bỏ qua) và chỉ khi tin sắp hiện công khai (active):
--   - giới hạn 10 tin / 24 giờ / người (đếm cả nháp) → P0001 rate_limited
--   - từ khoá reject → rejected; từ khoá review → pending_review
--   - tài khoản < 7 ngày → pending_review (tin đầu của người mới)
--   - giá < 30% trung vị 30 ngày cùng category (≥ 5 mẫu) → pending_review
-- Sửa tin đang active: kiểm lại từ khoá khi tiêu đề / mô tả đổi.
create or replace function public.trg_listings_moderate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_reasons text[] := '{}';
  v_text text;
  v_action text;
  v_median numeric;
  v_samples int;
  v_account_age interval;
begin
  -- security definer → current_user là owner; vai trò của người gọi (PostgREST SET ROLE) nằm ở setting 'role'.
  if coalesce(current_setting('role', true), 'none') not in ('anon', 'authenticated') or public.is_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if (select count(*) from public.listings
        where owner_id = new.owner_id and created_at > now() - interval '24 hours') >= 10 then
      raise exception using errcode = 'P0001', message = 'rate_limited', detail = 'listings: tối đa 10 tin / 24 giờ';
    end if;
  end if;

  if new.status <> 'active' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.title is not distinct from old.title and new.description is not distinct from old.description
     and new.price is not distinct from old.price and old.status = 'active' then
    return new;
  end if;

  v_text := public.f_unaccent(coalesce(new.title, '') || ' ' || coalesce(new.description, ''));
  select case when bool_or(k.action = 'reject') then 'reject' when count(*) > 0 then 'review' end into v_action
  from public.banned_keywords k
  where (k.categories is null or new.category = any (k.categories))
    -- theo ranh giới từ (\m … \M): "ca do" không khớp "ca dong" (cá đồng). Từ khoá chỉ gồm chữ / số / dấu cách
    -- (CHECK ở bảng) nên không cần escape ký tự regex.
    and v_text ~ ('\m' || public.f_unaccent(k.keyword) || '\M');
  if v_action = 'reject' then
    v_reasons := array_append(v_reasons, 'keyword_reject');
  elsif v_action = 'review' then
    v_reasons := array_append(v_reasons, 'keyword');
  end if;

  if tg_op = 'INSERT' then
    select now() - p.created_at into v_account_age from public.profiles p where p.id = new.owner_id;
    if v_account_age < interval '7 days' then
      v_reasons := array_append(v_reasons, 'new_account');
    end if;
  end if;

  if new.price is not null and new.price > 0 and new.price_type = 'fixed' then
    select percentile_cont(0.5) within group (order by l.price), count(*) into v_median, v_samples
    from public.listings l
    where l.category = new.category and l.status in ('active', 'sold') and l.price > 0
      and l.created_at > now() - interval '30 days' and l.id <> new.id;
    if v_samples >= 5 and new.price < v_median * 0.3 then
      v_reasons := array_append(v_reasons, 'low_price');
    end if;
  end if;

  new.moderation_reasons := v_reasons;
  if 'keyword_reject' = any (v_reasons) then
    new.status := 'rejected';
  elsif cardinality(v_reasons) > 0 then
    new.status := 'pending_review';
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_listings_moderate() from public, anon, authenticated;

create trigger trg_listings_moderate before insert or update on public.listings
  for each row execute function public.trg_listings_moderate();

-- Đưa vào hàng chờ sau khi tin đã ghi (FK). Tin bị từ chối tự động cũng vào để moderator xem lại nếu cần.
create or replace function public.trg_listings_queue()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
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
revoke execute on function public.trg_listings_queue() from public, anon, authenticated;

-- Không dùng "update of status": status có thể do trigger kiểm duyệt đổi (người dùng chỉ sửa tiêu đề).
create trigger trg_listings_queue after insert or update on public.listings
  for each row execute function public.trg_listings_queue();

-- ═════════════════════════════════════════════════════════════════════════════
-- review_listing — moderator duyệt / từ chối tin chờ duyệt. Ghi audit_log + thông báo cho chủ tin.
-- ═════════════════════════════════════════════════════════════════════════════
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
          jsonb_build_object('title', v_listing.title),
          jsonb_build_object('screen', 'listing', 'params', jsonb_build_object('id', p_listing_id)));
end;
$$;
comment on function public.review_listing(uuid, boolean, text) is 'Staff duyệt (active) / từ chối (rejected) tin chờ duyệt; ghi audit_log + notification cho chủ tin.';
revoke execute on function public.review_listing(uuid, boolean, text) from public, anon;
grant execute on function public.review_listing(uuid, boolean, text) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- renew_listing — chủ tin gia hạn tin active sắp hết hạn (≤ 3 ngày) hoặc đã hết hạn.
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.renew_listing(p_listing_id uuid)
returns timestamptz language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.listings;
  v_expires timestamptz;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if public.is_banned() then
    raise exception using errcode = 'P0001', message = 'banned';
  end if;
  select * into v_listing from public.listings
  where id = p_listing_id and owner_id = v_uid and deleted_at is null for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_listing.status not in ('active', 'expired') then
    raise exception using errcode = 'P0001', message = 'conflict', detail = 'renew_listing: chỉ gia hạn tin đang đăng / hết hạn';
  end if;
  if v_listing.status = 'active' and v_listing.expires_at > now() + interval '3 days' then
    raise exception using errcode = 'P0001', message = 'too_early', detail = 'renew_listing: chỉ gia hạn trong 3 ngày cuối';
  end if;

  v_expires := now() + public.listing_default_ttl(v_listing.category);
  update public.listings set status = 'active', expires_at = v_expires where id = p_listing_id;
  return v_expires;
end;
$$;
comment on function public.renew_listing(uuid) is 'Gia hạn tin (mặc định theo category). Trả expires_at mới. Lỗi: auth_required, banned, not_found, conflict, too_early.';
revoke execute on function public.renew_listing(uuid) from public, anon;
grant execute on function public.renew_listing(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- reveal_contact — SĐT người đăng (chỉ người đăng nhập, không bị cấm, tin còn hiện với người gọi).
-- 20 lần / giờ / người; mỗi lần ghi audit_log('contact.reveal'). Trả null khi người đăng không có SĐT (Google).
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.reveal_contact(p_listing_id uuid)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_phone text;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  if public.is_banned() then
    raise exception using errcode = 'P0001', message = 'banned';
  end if;
  select l.owner_id into v_owner from public.listings l
  join public.profiles p on p.id = l.owner_id
  where l.id = p_listing_id and l.status = 'active' and l.deleted_at is null
    and (l.expires_at is null or l.expires_at > now())
    and p.deleted_at is null and not p.is_banned
    and not public.is_blocked(l.owner_id, v_uid);
  if v_owner is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  perform public.assert_rate_limit(v_uid::text, 'reveal_contact', 20, 3600);
  select phone into v_phone from public.profiles where id = v_owner;
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (v_uid, 'contact.reveal', 'listing', p_listing_id::text, jsonb_build_object('owner_id', v_owner));
  return v_phone;
end;
$$;
comment on function public.reveal_contact(uuid) is 'SĐT người đăng (849…), null nếu không có. Đăng nhập, 20 / giờ, ghi audit_log. Lỗi: auth_required, banned, not_found, rate_limited.';
revoke execute on function public.reveal_contact(uuid) from public, anon;
grant execute on function public.reveal_contact(uuid) to authenticated;
