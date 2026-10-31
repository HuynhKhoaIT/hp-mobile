-- Listings (tuần 3 — phần đọc; ghi qua PostgREST + RLS, kiểm duyệt tự động ở tuần 4)
-- Mục đích: mẫu Listing dùng chung Pass đồ / Tìm trọ / Tìm việc / Đồ thất lạc (supabase/CLAUDE.md mục 4).
-- Bảng: listings (+ trigger slug / short_id / expires_at / guard), listing_translations (cache dịch, tuần 10),
--       listing_views (gợi ý), search_logs (từ khoá hot). Helper f_unaccent cho tìm không dấu.
-- Client: @hp/shared schemas/listing/*, @hp/core listings.ts; người khác đọc qua view public_listings
--         (migration 20261031120000_public_listings), không đọc bảng gốc.
--
-- Ma trận quyền listings
-- | Vai trò        | select                 | insert                    | update                         | delete |
-- |----------------|------------------------|---------------------------|--------------------------------|--------|
-- | anon           | qua public_listings    | –                         | –                              | –      |
-- | user (chủ)     | tin của mình (mọi TT)  | owner = mình, draft/active | tin của mình chưa xoá (guard) | xoá mềm (deleted_at) |
-- | user (khác)    | qua public_listings    | –                         | –                              | –      |
-- | user bị cấm    | tin của mình           | –                         | tin của mình (guard)           | –      |
-- | moderator/admin| tất cả                 | như user                  | tất cả                         | xoá mềm |
-- | service role   | bỏ qua RLS             |                           |                                |        |

-- ═════════════════════════════════════════════════════════════════════════════
-- Bỏ dấu bất biến (unaccent gốc là stable → không dùng được trong cột generated / index)
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.f_unaccent(p_text text)
returns text language sql immutable strict parallel safe set search_path = '' as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, replace(replace(p_text, 'đ', 'd'), 'Đ', 'D')));
$$;
comment on function public.f_unaccent(text) is 'lower + bỏ dấu tiếng Việt (đ → d). Dùng cho search_vector, index trigram và tham số tìm kiếm.';
revoke execute on function public.f_unaccent(text) from public;
grant execute on function public.f_unaccent(text) to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Enum (khớp LISTING_CATEGORIES / LISTING_STATUSES trong @hp/shared enums.ts)
-- ═════════════════════════════════════════════════════════════════════════════
create type public.listing_category as enum (
  'pass_electronics', 'pass_vehicle', 'pass_ppe', 'pass_home',
  'room_rent', 'room_share',
  'job_main', 'job_parttime',
  'lost', 'found'
);
create type public.listing_status as enum ('draft', 'pending_review', 'active', 'sold', 'closed', 'expired', 'rejected');

-- ═════════════════════════════════════════════════════════════════════════════
-- listings
-- ═════════════════════════════════════════════════════════════════════════════
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category public.listing_category not null,
  status public.listing_status not null default 'active',
  title text not null check (char_length(btrim(title)) between 1 and 120),
  slug text not null unique,                           -- trigger: slugify(title) || '-' || short_id
  short_id text not null unique check (short_id ~ '^[0-9a-z]{6}$'),
  description text check (char_length(description) <= 5000),
  price numeric(14, 0) check (price >= 0),             -- VND; null khi thoả thuận / miễn phí
  price_type text not null default 'fixed' check (price_type in ('fixed', 'negotiable', 'free')),
  attributes jsonb not null default '{}' check (jsonb_typeof(attributes) = 'object'),
  site text references public.sites (code) on update cascade on delete set null,
  location extensions.geography(point, 4326),          -- chính xác: chỉ chủ tin + staff; công khai làm tròn ~300 m
  address_text text check (char_length(address_text) <= 200),
  images text[] not null default '{}' check (cardinality(images) <= 10),   -- path trong bucket listing-images, ảnh đầu là bìa
  lang text not null default 'vi' check (lang in ('vi', 'en', 'zh')),
  view_count int not null default 0,
  expires_at timestamptz,                              -- trigger đặt mặc định theo category
  search_vector tsvector generated always as (
    to_tsvector('simple', public.f_unaccent(coalesce(title, '') || ' ' || coalesce(description, '')))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on table public.listings is 'Tin đăng (4 tính năng Listing). Người khác đọc qua public_listings / RPC công khai.';
comment on column public.listings.attributes is 'Thuộc tính riêng theo category — Zod ListingAttributes trong packages/shared/src/schemas/listing.';
comment on column public.listings.images is 'Path trong bucket listing-images: {owner_id}/{listing_id}/{n}.webp. Ảnh đầu là bìa.';

create index listings_cat_status_idx on public.listings (category, status, created_at desc);
create index listings_active_created_idx on public.listings (created_at desc) where status = 'active' and deleted_at is null;
create index listings_owner_idx on public.listings (owner_id, created_at desc);
create index listings_location_idx on public.listings using gist (location);
create index listings_search_idx on public.listings using gin (search_vector);
create index listings_title_trgm_idx on public.listings using gin (public.f_unaccent(title) extensions.gin_trgm_ops);
create index listings_attrs_idx on public.listings using gin (attributes jsonb_path_ops);

alter table public.listings enable row level security;
grant select, insert, update on public.listings to authenticated;   -- không delete: xoá mềm bằng deleted_at

create trigger trg_listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

-- ── slug / short_id / expires_at ──────────────────────────────────────────────
-- Hết hạn mặc định: pass / room 30 ngày, job 14 ngày, lost / found 60 ngày (docs/ARCHITECTURE.md mục 2).
create or replace function public.listing_default_ttl(p_category public.listing_category)
returns interval language sql immutable parallel safe set search_path = '' as $$
  select case
    when p_category in ('job_main', 'job_parttime') then interval '14 days'
    when p_category in ('lost', 'found') then interval '60 days'
    else interval '30 days'
  end;
$$;
revoke execute on function public.listing_default_ttl(public.listing_category) from public;

create or replace function public.trg_listings_identity()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_try int := 0;
begin
  if tg_op = 'INSERT' then
    -- short_id ngẫu nhiên, thử lại khi trùng (6 ký tự base36 ≈ 2 tỉ giá trị)
    loop
      new.short_id := public.gen_short_id(6);
      exit when not exists (select 1 from public.listings where short_id = new.short_id);
      v_try := v_try + 1;
      if v_try > 5 then
        raise exception using errcode = 'P0001', message = 'conflict', detail = 'listings: không sinh được short_id';
      end if;
    end loop;
    new.expires_at := coalesce(new.expires_at, now() + public.listing_default_ttl(new.category));
  else
    new.short_id := old.short_id;   -- không đổi: link chia sẻ cũ vẫn mở được
  end if;

  if tg_op = 'INSERT' or new.title is distinct from old.title then
    new.slug := public.slugify(new.title) || '-' || new.short_id;
  else
    new.slug := old.slug;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_listings_identity() from public, anon, authenticated;

create trigger trg_listings_identity before insert or update on public.listings
  for each row execute function public.trg_listings_identity();

-- ── guard: cột và trạng thái client không được tự đặt ─────────────────────────
-- Chủ tin: draft / active / sold / closed. pending_review / rejected / expired chỉ server (kiểm duyệt, cron).
-- Chủ tin không tự mở lại tin đang chờ duyệt / bị từ chối. Staff và service role bỏ qua.
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
    if new.view_count <> 0 or new.deleted_at is not null then
      raise exception using errcode = '42501', message = 'forbidden', detail = 'listings: cột chỉ server được đặt';
    end if;
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id
     or new.category is distinct from old.category
     or new.view_count is distinct from old.view_count
     or new.created_at is distinct from old.created_at
     or new.expires_at is distinct from old.expires_at then   -- gia hạn qua renewListing (tuần 4)
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
revoke execute on function public.trg_listings_guard() from public, anon, authenticated;

create trigger trg_listings_guard before insert or update on public.listings
  for each row execute function public.trg_listings_guard();

-- ── RLS ────────────────────────────────────────────────────────────────────────
-- Bảng gốc (có vị trí chính xác) chỉ cho chủ tin và staff; người khác đọc public_listings.
create policy listings_select_owner_or_staff on public.listings for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_staff()));

create policy listings_insert_owner on public.listings for insert to authenticated
  with check (owner_id = (select auth.uid()) and not (select public.is_banned()));

-- Bị cấm vẫn được đóng / xoá mềm tin của mình (không đăng mới, không mở lại: guard + policy insert).
create policy listings_update_owner on public.listings for update to authenticated
  using (owner_id = (select auth.uid()) and deleted_at is null)
  with check (owner_id = (select auth.uid())
              and (not (select public.is_banned()) or status in ('draft', 'sold', 'closed') or deleted_at is not null));

-- with check phải là is_staff(), không phải true: Postgres OR các with check của mọi policy permissive,
-- 'true' ở đây sẽ cho mọi người (kể cả bị cấm) vượt qua with check của listings_update_owner.
create policy listings_update_staff on public.listings for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- ═════════════════════════════════════════════════════════════════════════════
-- listing_translations — cache bản dịch (translate-content, tuần 10). Chỉ service role ghi.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.listing_translations (
  listing_id uuid not null references public.listings (id) on delete cascade,
  lang text not null check (lang in ('vi', 'en', 'zh')),
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  primary key (listing_id, lang)
);
comment on table public.listing_translations is 'Cache bản dịch tin đăng. Chỉ Edge Function translate-content ghi / đọc (service role).';
alter table public.listing_translations enable row level security;   -- không policy: chỉ service role

-- ═════════════════════════════════════════════════════════════════════════════
-- listing_views — ai đã xem tin nào (gợi ý home_feed tuần 9). Ghi qua RPC record_listing_view.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.listing_views (
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  viewed_on date not null default current_date,
  viewed_at timestamptz not null default now(),
  primary key (listing_id, user_id, viewed_on)        -- 1 lượt / người / ngày
);
create index listing_views_user_idx on public.listing_views (user_id, viewed_at desc);
alter table public.listing_views enable row level security;
grant select on public.listing_views to authenticated;
create policy listing_views_select_own on public.listing_views for select to authenticated
  using (user_id = (select auth.uid()));

-- Ghi lượt xem: tăng view_count 1 lần / người / ngày. Khách (anon) không đếm để tránh bơm lượt xem.
create or replace function public.record_listing_view(p_listing_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;
  insert into public.listing_views (listing_id, user_id)
  select l.id, v_uid from public.listings l
  where l.id = p_listing_id and l.status = 'active' and l.deleted_at is null and l.owner_id <> v_uid
  on conflict do nothing;
  if found then
    update public.listings set view_count = view_count + 1 where id = p_listing_id;
  end if;
end;
$$;
comment on function public.record_listing_view(uuid) is 'Đếm lượt xem (1 / người / ngày, không đếm chủ tin, không đếm khách).';
revoke execute on function public.record_listing_view(uuid) from public, anon;
grant execute on function public.record_listing_view(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- search_logs — từ khoá người dùng tìm (gợi ý từ khoá hot). Ghi qua RPC log_search.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.search_logs (
  id bigint generated always as identity primary key,
  query text not null check (char_length(query) between 1 and 100),
  category public.listing_category,
  results_count int not null default 0,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index search_logs_created_idx on public.search_logs (created_at desc);
alter table public.search_logs enable row level security;
grant select on public.search_logs to authenticated;
create policy search_logs_select_staff on public.search_logs for select to authenticated
  using ((select public.is_staff()));

-- RPC search_listings là stable (không ghi được) → client gọi log_search riêng sau khi tìm có từ khoá.
create or replace function public.log_search(p_query text, p_category public.listing_category default null, p_results int default 0)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_query text := left(btrim(coalesce(p_query, '')), 100);
begin
  if v_query = '' then
    return;
  end if;
  insert into public.search_logs (query, category, results_count, user_id)
  values (v_query, p_category, greatest(coalesce(p_results, 0), 0), auth.uid());
end;
$$;
comment on function public.log_search(text, public.listing_category, int) is 'Ghi từ khoá tìm kiếm (cắt 100 ký tự). Khách cũng ghi được (không có user_id).';
revoke execute on function public.log_search(text, public.listing_category, int) from public;
grant execute on function public.log_search(text, public.listing_category, int) to anon, authenticated;
