-- Gia cố sau review schema + RLS lần 2 (người thứ hai, ARCHITECTURE mục 12) — kết quả ở docs/plan/backend.md "Review RLS lần 2".
-- Test: supabase/tests/120_review2.test.sql. Client: không đổi chữ ký; public_listings thêm điều kiện (tin chưa từng duyệt
-- không còn công khai); listings thêm 2 cột server (published_at, moderation_hold) — type sinh lại, client không ghi.
--
-- H1  Chủ tin chuyển nháp / tin bị từ chối sang closed / sold → lên trang công khai mà không qua kiểm duyệt.
--     → listings.published_at (lần đầu active hợp lệ); public_listings chỉ hiện tin đã từng xuất bản và không bị khoá;
--       chủ tin chỉ đánh dấu sold từ trạng thái đã xuất bản (active, sold, closed, expired).
-- H2  Chủ tin gỡ được việc staff ẩn / từ chối và việc tự ẩn do báo cáo (đi vòng closed / draft → active).
--     → listings.moderation_hold: bật khi kiểm duyệt / staff / báo cáo đưa tin xuống; còn khoá thì chủ tin mở lại
--       luôn vào hàng chờ (lý do resubmit). Chỉ staff duyệt (status → active) mới gỡ khoá.
-- M1  Staff huỷ nhóm vi phạm nhưng nội dung vẫn công khai → staff_cancel_group ẩn nhóm (deleted_at, xoá mềm).
-- M2  lost_found_matches.distance_m chính xác tới mét → dò vị trí bằng nhiều tin giả → làm tròn bậc 500 m.
-- M3  Staff bị cấm / khoá tạm vẫn giữ quyền staff → is_staff() / is_admin() xét is_banned, banned_until.
-- M4  Moderator sửa mọi cột hồ sơ người khác (khoá được admin bằng deleted_at) không audit → staff trên hồ sơ người khác
--     chỉ đổi badges / banned_until (admin thêm role / is_banned); moderator không đụng hồ sơ staff khác.
-- L1  Người dùng tự bỏ deleted_at sau khi xoá tài khoản → deleted_at chỉ server (RPC delete_my_account) đổi.
-- L3  anon select bảng venues lộ created_by / reviewed_by / reject_reason → grant theo cột.

-- ═════════════════════════════════════════════════════════════════════════════
-- M3: helper staff bỏ qua tài khoản bị cấm / đang khoá tạm
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('moderator', 'admin') and deleted_at is null
      and not is_banned and (banned_until is null or banned_until <= now())
  );
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and deleted_at is null
      and not is_banned and (banned_until is null or banned_until <= now())
  );
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- H1 + H2: cột kiểm duyệt trên listings
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.listings add column if not exists published_at timestamptz;
alter table public.listings add column if not exists moderation_hold boolean not null default false;
comment on column public.listings.published_at is
  'Lần đầu tin lên active hợp lệ (qua kiểm duyệt hoặc staff duyệt). Null → chưa từng công khai: không vào public_listings. Chỉ server đặt.';
comment on column public.listings.moderation_hold is
  'Khoá kiểm duyệt: bật khi kiểm duyệt / staff / báo cáo đưa tin xuống; còn khoá thì chủ tin mở lại → pending_review. Chỉ staff duyệt mới gỡ.';

-- Backfill: tin đã công khai (active / sold / closed / expired) coi như đã xuất bản; tin pending / rejected giữ khoá.
-- replica → không chạy trigger (updated_at, webhook revalidate).
set session_replication_role = replica;
update public.listings set published_at = created_at
where published_at is null and status in ('active', 'sold', 'closed', 'expired');
update public.listings set moderation_hold = true where status in ('pending_review', 'rejected');
set session_replication_role = origin;

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
    if new.view_count <> 0 or new.deleted_at is not null or cardinality(new.moderation_reasons) > 0
       or new.published_at is not null or new.moderation_hold then
      raise exception using errcode = '42501', message = 'forbidden', detail = 'listings: cột chỉ server được đặt';
    end if;
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id
     or new.category is distinct from old.category
     or new.view_count is distinct from old.view_count
     or new.created_at is distinct from old.created_at
     or new.expires_at is distinct from old.expires_at
     or new.moderation_reasons is distinct from old.moderation_reasons
     or new.published_at is distinct from old.published_at
     or new.moderation_hold is distinct from old.moderation_hold then
    raise exception using errcode = '42501', message = 'forbidden', detail = 'listings: cột chỉ server được đổi';
  end if;

  if new.status is distinct from old.status then
    if new.status not in ('draft', 'active', 'sold', 'closed') then
      raise exception using errcode = '42501', message = 'forbidden', detail = 'listings: trạng thái chỉ server đặt';
    end if;
    -- rejected → active được phép: đó là "gửi duyệt lại" — trg_listings_moderate luôn chuyển thành pending_review.
    if new.status = 'active' and old.status in ('pending_review', 'expired') then
      raise exception using errcode = '42501', message = 'forbidden', detail = 'listings: không tự mở tin chờ duyệt / hết hạn (gia hạn qua renew_listing)';
    end if;
    -- H1: đã bán chỉ từ tin đã công khai. Đóng (rút tin) thì từ trạng thái nào cũng được — view công khai vẫn ẩn tin
    -- chưa từng xuất bản (published_at null) hoặc còn khoá kiểm duyệt.
    if new.status = 'sold' and old.status not in ('active', 'sold', 'closed', 'expired') then
      raise exception using errcode = '42501', message = 'forbidden', detail = 'listings: chỉ đánh dấu đã bán tin đang đăng';
    end if;
  end if;

  if old.deleted_at is not null then
    raise exception using errcode = '42501', message = 'forbidden', detail = 'listings: tin đã xoá';
  end if;
  return new;
end;
$$;

-- trg_listings_moderate: thêm khoá kiểm duyệt (H2). Phần còn lại giữ nguyên bản 20261101120000.
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
    and v_text ~ ('\m' || public.f_unaccent(k.keyword) || '\M');
  if v_action = 'reject' then
    v_reasons := array_append(v_reasons, 'keyword_reject');
  elsif v_action = 'review' then
    v_reasons := array_append(v_reasons, 'keyword');
  end if;

  if tg_op = 'INSERT' or old.status <> 'active' then
    select now() - p.created_at into v_account_age from public.profiles p where p.id = new.owner_id;
    if v_account_age < interval '7 days' then
      v_reasons := array_append(v_reasons, 'new_account');
    end if;
  end if;

  -- Gửi lại tin bị từ chối / bị staff ẩn / bị tự ẩn do báo cáo (khoá còn) → luôn để moderator xem lại.
  if tg_op = 'UPDATE' and old.status <> 'active'
     and (old.status = 'rejected' or old.moderation_hold
          or exists (select 1 from public.moderation_queue q where q.listing_id = new.id and q.status = 'rejected')) then
    v_reasons := array_append(v_reasons, 'resubmit');
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
    new.moderation_hold := true;
  elsif cardinality(v_reasons) > 0 then
    new.status := 'pending_review';
    new.moderation_hold := true;
  end if;
  return new;
end;
$$;

-- Chạy sau trg_listings_moderate (thứ tự tên): đặt published_at khi tin thật sự active; staff / server đưa tin xuống
-- (closed, rejected, pending_review) → bật khoá; tin lên active (đã qua kiểm duyệt hoặc staff duyệt) → gỡ khoá.
create or replace function public.trg_listings_publish()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_client boolean := coalesce(current_setting('role', true), 'none') in ('anon', 'authenticated') and not public.is_staff();
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    new.published_at := coalesce(new.published_at, now());
    new.moderation_hold := false;
  elsif tg_op = 'UPDATE' and not v_client and new.status is distinct from old.status
        and new.status in ('closed', 'rejected', 'pending_review') then
    new.moderation_hold := true;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_listings_publish() from public, anon, authenticated;
drop trigger if exists trg_listings_publish on public.listings;
create trigger trg_listings_publish before insert or update on public.listings
  for each row execute function public.trg_listings_publish();

-- Báo cáo ≥ 3 / 24 giờ → ẩn tạm + khoá (chạy security definer với role của người báo cáo nên trg_listings_publish coi là client).
create or replace function public.trg_reports_auto_hide()
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
  set status = 'pending_review', moderation_reasons = array['report'], moderation_hold = true
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

-- H1 + H2: view công khai chỉ hiện tin đã từng xuất bản và không còn khoá kiểm duyệt (giữ nguyên cột / thứ tự cột của bản 20261101100000).
create or replace view public.public_listings with (security_invoker = false) as
select l.id, l.slug, l.short_id, l.category, l.status, l.title, l.description, l.price, l.price_type, l.attributes,
       l.site, s.name as site_name,
       extensions.st_y(g.snapped) as lat, extensions.st_x(g.snapped) as lng,
       (round(extensions.st_distance(g.snapped::extensions.geography, s.location) / 100) * 100)::int as distance_to_site_m,
       l.address_text, l.images, l.lang, l.view_count, l.expires_at, l.created_at, l.updated_at,
       l.owner_id, public.short_name(p.full_name) as owner_name, p.avatar_url as owner_avatar_url,
       p.badges as owner_badges, p.rating_avg as owner_rating_avg, p.rating_count as owner_rating_count,
       p.created_at as owner_since, l.search_vector,
       l.status = 'active' and l.expires_at is not null and l.expires_at <= now() as is_expired,
       case
         when l.status = 'active' and (l.expires_at is null or l.expires_at > now()) then null::timestamptz
         when l.status = 'active' then l.expires_at
         else l.updated_at
       end as inactive_since
from public.listings l
join public.profiles p on p.id = l.owner_id
left join public.sites s on s.code = l.site
left join lateral (select extensions.st_snaptogrid(l.location::extensions.geometry, 0.003) as snapped) g on true
where l.status in ('active', 'sold', 'closed', 'expired')
  and l.published_at is not null and not l.moderation_hold
  and l.deleted_at is null
  and p.deleted_at is null and not p.is_banned and (p.banned_until is null or p.banned_until <= now())
  and not public.is_blocked(l.owner_id, (select auth.uid()));

-- ═════════════════════════════════════════════════════════════════════════════
-- M1: staff huỷ nhóm vi phạm → ẩn khỏi trang công khai (xoá mềm, thành viên đã nhận group_cancelled)
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.staff_cancel_group(p_group_id uuid, p_note text default null)
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
  update public.groups set deleted_at = now() where id = p_group_id;
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), 'group.cancel', 'group', p_group_id::text,
          jsonb_build_object('from', v_old, 'note', left(p_note, 500), 'hidden', true));
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- M2: khoảng cách khớp đồ thất lạc làm tròn bậc 500 m (tối thiểu 500)
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.trg_lost_found_matches_round()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.distance_m is not null then
    new.distance_m := greatest(500, (round(new.distance_m / 500.0) * 500)::int);
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_lost_found_matches_round() from public, anon, authenticated;
drop trigger if exists trg_lost_found_matches_round on public.lost_found_matches;
create trigger trg_lost_found_matches_round before insert or update on public.lost_found_matches
  for each row execute function public.trg_lost_found_matches_round();
update public.lost_found_matches set distance_m = distance_m where distance_m is not null;

-- ═════════════════════════════════════════════════════════════════════════════
-- M4 + L1: guard hồ sơ
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.trg_profiles_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_changed text[];
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
     or new.push_tokens is distinct from old.push_tokens
     or new.deleted_at is distinct from old.deleted_at then        -- L1: xoá / khôi phục chỉ qua RPC
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

  -- M4: staff sửa hồ sơ NGƯỜI KHÁC chỉ ở cột quản trị (có audit qua trg_profiles_audit); moderator không đụng staff khác.
  if old.id is distinct from v_uid then
    select array_agg(k) into v_changed
    from jsonb_each(to_jsonb(new)) n(k, v)
    where n.v is distinct from (to_jsonb(old) -> n.k)
      and n.k not in ('badges', 'banned_until', 'role', 'is_banned', 'updated_at');
    if v_changed is not null then
      raise exception using errcode = '42501', message = 'forbidden',
        detail = 'profiles: staff chỉ đổi badges / banned_until / role / is_banned của người khác';
    end if;
    if old.role in ('moderator', 'admin') and not public.is_admin() then
      raise exception using errcode = '42501', message = 'forbidden', detail = 'profiles: moderator không sửa hồ sơ staff';
    end if;
  end if;

  return new;
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- L3: anon đọc venues theo cột (không lộ người góp / người duyệt / lý do từ chối)
-- ═════════════════════════════════════════════════════════════════════════════
revoke select on public.venues from anon;
grant select (id, name, sports, site, address_text, location, price_ref, phone, status, created_at, updated_at, deleted_at)
  on public.venues to anon;
