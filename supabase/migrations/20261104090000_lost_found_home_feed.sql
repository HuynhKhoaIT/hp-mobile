-- Tuần 9: khớp đồ thất lạc, lọc khoảng cách tới khu, gợi ý trang chủ.
-- Mục đích:
--   1. Đồ thất lạc: tin `lost` / `found` lên active → tìm tin đối ứng (cùng loại đồ, thời điểm mất / nhặt chênh ≤ 2 ngày,
--      cách < 2 km — thiếu toạ độ thì cùng khu) → ghi lost_found_matches + thông báo lost_found_match cho cả hai chủ tin.
--   2. search_listings thêm p_max_distance_m (khoảng cách tới khu làm việc — lọc trọ "cách nhà máy ≤ x km").
--   3. home_feed: tin cho Hub — cùng khu trước, danh mục người xem hay xem (listing_views 30 ngày), mới nhất.
-- Bảng / hàm: lost_found_matches (mới), trg_listings_match_lost_found, list_lost_found_matches, search_listings (đổi chữ ký
--   → drop + create), home_feed.
-- Client: @hp/core listLostFoundMatches, searchListings (maxDistanceM), getHomeFeed + hook; i18n push.lost_found_match.*.
--
-- Lệch có chủ đích so với ARCHITECTURE: match-lost-found là trigger trong DB (không Edge Function) — chỉ truy vấn
--   PostGIS + tạo notifications (push đi qua send-push sẵn có), đúng phân công "lost_found_match do trigger tạo"
--   ở .claude/rules/be-rpc-triggers-cron.md.
--
-- Ma trận quyền
-- | Vai trò   | lost_found_matches            | list_lost_found_matches | home_feed / search_listings |
-- |-----------|-------------------------------|-------------------------|-----------------------------|
-- | anon      | –                             | –                       | có                          |
-- | user      | đọc cặp có tin của mình        | tin của mình            | có                          |
-- | bị cấm    | như user                      | như user                | có                          |
-- | moderator | đọc tất cả                    | tin của mình            | có                          |
--
-- Explain (seed 500 tin): trigger khớp dùng listings_category_status_created_idx + lọc attributes (≤ 50 tin lost/found
--   active / khu); home_feed quét public_listings theo created_at desc (limit 50) như search_listings.

-- ═════════════════════════════════════════════════════════════════════════════
-- lost_found_matches
-- ═════════════════════════════════════════════════════════════════════════════
create table public.lost_found_matches (
  lost_id uuid not null references public.listings (id) on delete cascade,
  found_id uuid not null references public.listings (id) on delete cascade,
  distance_m int,                                   -- null: khớp theo cùng khu (thiếu toạ độ)
  created_at timestamptz not null default now(),
  primary key (lost_id, found_id)
);
comment on table public.lost_found_matches is 'Cặp tin mất / nhặt khớp nhau (trigger trg_listings_match_lost_found). Chủ một trong hai tin đọc được.';
create index lost_found_matches_found_idx on public.lost_found_matches (found_id);
alter table public.lost_found_matches enable row level security;
grant select on public.lost_found_matches to authenticated;

create function public.owns_listing(p_listing_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.listings where id = p_listing_id and owner_id = (select auth.uid()));
$$;
comment on function public.owns_listing(uuid) is 'Người gọi là chủ tin (helper RLS).';
grant execute on function public.owns_listing(uuid) to authenticated;

create policy lost_found_matches_select_owner on public.lost_found_matches for select to authenticated
  using (public.owns_listing(lost_id) or public.owns_listing(found_id) or (select public.is_staff()));

-- ═════════════════════════════════════════════════════════════════════════════
-- Trigger khớp: tin lost / found vừa active (đăng, được duyệt, sửa loại đồ / thời điểm / vị trí). Tối đa 5 tin đối ứng
-- gần nhất. Cặp mới → thông báo cho cả hai chủ tin (trừ chặn nhau, trừ tài khoản đã xoá). Tin đã "nhận lại"
-- (attributes.returned) không khớp.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.trg_listings_match_lost_found()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_other_category public.listing_category := case new.category when 'lost' then 'found' else 'lost' end;
  v_item text := new.attributes ->> 'item_type';
  v_at timestamptz;
  v_match record;
begin
  if new.status <> 'active' or new.deleted_at is not null or new.category not in ('lost', 'found')
     or coalesce((new.attributes ->> 'returned')::boolean, false) or v_item is null then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.status = 'active'
     and (old.attributes ->> 'item_type', old.attributes ->> 'lost_at', old.location, old.site)
         is not distinct from (new.attributes ->> 'item_type', new.attributes ->> 'lost_at', new.location, new.site) then
    return null;
  end if;
  v_at := coalesce(public.safe_timestamptz(new.attributes ->> 'lost_at'), new.created_at);

  for v_match in
    select o.id, o.owner_id, o.title,
           case when new.location is not null and o.location is not null
                then extensions.st_distance(new.location, o.location)::int end as distance_m
    from public.listings o
    join public.profiles op on op.id = o.owner_id and op.deleted_at is null and not op.is_banned
    where o.category = v_other_category
      and o.status = 'active' and o.deleted_at is null
      and (o.expires_at is null or o.expires_at > now())
      and o.owner_id <> new.owner_id
      and o.attributes ->> 'item_type' = v_item
      and not coalesce((o.attributes ->> 'returned')::boolean, false)
      and abs(extract(epoch from coalesce(public.safe_timestamptz(o.attributes ->> 'lost_at'), o.created_at) - v_at))
          <= 2 * 86400                                                         -- LOST_FOUND_MATCH.days
      and (case when new.location is not null and o.location is not null
                then extensions.st_dwithin(new.location, o.location, 2000)     -- LOST_FOUND_MATCH.radiusM
                else new.site is not null and o.site = new.site end)
      and not public.is_blocked(new.owner_id, o.owner_id)
    order by distance_m nulls last, o.created_at desc
    limit 5
  loop
    insert into public.lost_found_matches (lost_id, found_id, distance_m)
    values (case when new.category = 'lost' then new.id else v_match.id end,
            case when new.category = 'lost' then v_match.id else new.id end,
            v_match.distance_m)
    on conflict do nothing;
    if found then
      -- chủ tin mới: "có tin <loại ngược lại> giống đồ của bạn" → mở tin kia; chủ tin kia: tương tự.
      insert into public.notifications (user_id, type, title_key, body_key, params, data)
      values
        (new.owner_id, 'lost_found_match', 'lost_found_match.title',
         'lost_found_match.body_' || v_other_category::text,
         jsonb_build_object('title', v_match.title, 'mine', new.title),
         jsonb_build_object('screen', 'listing', 'params', jsonb_build_object('id', v_match.id))),
        (v_match.owner_id, 'lost_found_match', 'lost_found_match.title',
         'lost_found_match.body_' || new.category::text,
         jsonb_build_object('title', new.title, 'mine', v_match.title),
         jsonb_build_object('screen', 'listing', 'params', jsonb_build_object('id', new.id)));
    end if;
  end loop;
  return null;
end;
$$;
revoke execute on function public.trg_listings_match_lost_found() from public, anon, authenticated;
create trigger trg_listings_match_lost_found after insert or update on public.listings
  for each row execute function public.trg_listings_match_lost_found();

-- Đọc chuỗi ngày giờ client gửi trong attributes mà không làm hỏng câu lệnh khi sai định dạng.
create or replace function public.safe_timestamptz(p_text text)
returns timestamptz language plpgsql stable set search_path = '' as $$
begin
  return p_text::timestamptz;
exception when others then
  return null;
end;
$$;
grant execute on function public.safe_timestamptz(text) to anon, authenticated;

-- Tin khớp với một tin của mình (mới nhất trước). Tin kia bị ẩn / chặn / hết hạn → không trả (đọc qua public_listings).
create function public.list_lost_found_matches(p_listing_id uuid)
returns setof public.public_listings
language sql stable security invoker set search_path = '' as $$
  select v.*
  from public.lost_found_matches m
  join public.public_listings v on v.id = case when m.lost_id = p_listing_id then m.found_id else m.lost_id end
  where (m.lost_id = p_listing_id or m.found_id = p_listing_id)
    and v.status = 'active' and not v.is_expired
  order by m.distance_m nulls last, m.created_at desc
  limit 20;
$$;
comment on function public.list_lost_found_matches(uuid) is 'Tin mất / nhặt khớp với tin của người gọi (RLS lost_found_matches).';
revoke execute on function public.list_lost_found_matches(uuid) from public, anon;
grant execute on function public.list_lost_found_matches(uuid) to authenticated;

-- Tin trọ cần ≥ 3 ảnh khi lên công khai (LISTING_IMAGES.roomMin; Zod ở @hp/shared kiểm trước). Chỉ chặn client, chỉ
-- khi tin chuyển sang active hoặc đổi ảnh lúc đang active — tin cũ ít ảnh vẫn sửa chữ được. Lỗi P0001 images_min.
-- Tên xếp trước trg_listings_moderate (BEFORE chạy theo thứ tự tên) để kiểm trạng thái client gửi, trước khi kiểm duyệt
-- đổi sang pending_review.
create function public.trg_listings_images_min()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated')
     and new.category in ('room_rent', 'room_share') and new.status = 'active'
     and coalesce(cardinality(new.images), 0) < 3
     and (tg_op = 'INSERT' or old.status is distinct from 'active' or new.images is distinct from old.images) then
    raise exception using errcode = 'P0001', message = 'images_min', detail = 'listings: tin trọ cần ít nhất 3 ảnh';
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_listings_images_min() from public, anon, authenticated;
create trigger trg_listings_images_min before insert or update on public.listings
  for each row execute function public.trg_listings_images_min();

-- "Đã nhận lại đồ": chủ tin lost / found đánh dấu returned + đóng tin trong một lệnh (definer: không mở cột
-- attributes / status tuỳ ý cho đường này). Lỗi P0001: auth_required, not_found (không phải chủ / không phải tin thất lạc).
create function public.mark_listing_returned(p_listing_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;
  update public.listings
  set attributes = attributes || '{"returned": true}'::jsonb,
      status = case when status in ('active', 'draft', 'pending_review') then 'closed' else status end
  where id = p_listing_id and owner_id = auth.uid() and deleted_at is null and category in ('lost', 'found');
  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
end;
$$;
comment on function public.mark_listing_returned(uuid) is 'Chủ tin thất lạc: đánh dấu đã trả lại + đóng tin.';
revoke execute on function public.mark_listing_returned(uuid) from public, anon;
grant execute on function public.mark_listing_returned(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- search_listings + p_max_distance_m (khoảng cách tới khu, làm tròn 100 m trong view). Đổi chữ ký → drop + create.
-- ═════════════════════════════════════════════════════════════════════════════
drop function public.search_listings(public.listing_category[], text, text, double precision, double precision, int,
  numeric, numeric, jsonb, int, timestamptz);
create function public.search_listings(
  p_categories public.listing_category[] default null,
  p_query text default null,
  p_site text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m int default 10000,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_attributes jsonb default null,
  p_limit int default 20,
  p_cursor timestamptz default null,
  p_max_distance_m int default null
)
returns setof public.public_listings
language sql stable security invoker set search_path = '' as $$
  with q as (
    select nullif(public.f_unaccent(left(btrim(coalesce(p_query, '')), 100)), '') as text
  )
  select v.*
  from public.public_listings v, q
  where v.status = 'active' and not v.is_expired
    and (p_categories is null or cardinality(p_categories) = 0 or v.category = any (p_categories))
    and (q.text is null
         or v.search_vector @@ plainto_tsquery('simple', q.text)
         or public.f_unaccent(v.title) operator(extensions.%) q.text
         or public.f_unaccent(v.title) like '%' || replace(replace(replace(q.text, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    and (p_site is null or v.site = p_site)
    and (p_lat is null or p_lng is null
         or extensions.st_dwithin(
              extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography,
              extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
              least(greatest(coalesce(p_radius_m, 10000), 100), 50000)))
    and (p_max_distance_m is null
         or (v.distance_to_site_m is not null and v.distance_to_site_m <= least(greatest(p_max_distance_m, 100), 50000)))
    and (p_price_min is null or v.price >= p_price_min)
    and (p_price_max is null or v.price <= p_price_max)
    and (p_attributes is null or v.attributes @> p_attributes)
    and (p_cursor is null or v.created_at < p_cursor)
  order by v.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
comment on function public.search_listings(public.listing_category[], text, text, double precision, double precision, int,
  numeric, numeric, jsonb, int, timestamptz, int) is
  'Tìm tin active (anon được). p_max_distance_m: cách khu làm việc của tin tối đa (tin không có vị trí bị loại).';
revoke execute on function public.search_listings(public.listing_category[], text, text, double precision, double precision,
  int, numeric, numeric, jsonb, int, timestamptz, int) from public;
grant execute on function public.search_listings(public.listing_category[], text, text, double precision, double precision,
  int, numeric, numeric, jsonb, int, timestamptz, int) to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- home_feed — "Gợi ý cho bạn" ở Hub. Khu: p_site → khu trong hồ sơ → không lọc. Thứ hạng: cùng khu, danh mục người xem
-- đã xem nhiều trong 30 ngày (top 3), mới nhất; không trả tin của chính mình. Definer để đọc listing_views của chính
-- người gọi (auth.uid()); kết quả vẫn qua public_listings (che PII, ẩn khi chặn).
-- ═════════════════════════════════════════════════════════════════════════════
create function public.home_feed(p_site text default null, p_limit int default 20)
returns setof public.public_listings
language sql stable security definer set search_path = '' as $$
  with me as (
    select (select auth.uid()) as uid,
           coalesce(p_site, (select site from public.profiles where id = (select auth.uid()))) as site
  ), fav as (
    select l.category
    from public.listing_views lv
    join public.listings l on l.id = lv.listing_id
    where lv.user_id = (select uid from me) and lv.viewed_at > now() - interval '30 days'
    group by l.category
    order by count(*) desc
    limit 3
  )
  select v.*
  from public.public_listings v, me
  where v.status = 'active' and not v.is_expired
    and (me.uid is null or v.owner_id <> me.uid)
    and v.created_at > now() - interval '30 days'
  order by (me.site is not null and v.site = me.site) desc,
           (v.category in (select category from fav)) desc,
           v.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
comment on function public.home_feed(text, int) is 'Gợi ý tin cho Hub (anon được): cùng khu → danh mục hay xem → mới nhất, 30 ngày.';
revoke execute on function public.home_feed(text, int) from public;
grant execute on function public.home_feed(text, int) to anon, authenticated;
