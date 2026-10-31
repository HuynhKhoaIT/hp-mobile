-- Trang chủ (Hub) — banner + thống kê "Tin của bạn" (docs/design/home.md §4.4, §4.5)
-- Bảng: banners (admin quản lý, ai cũng đọc banner đang hiệu lực). Bucket: banners (public, admin ghi).
-- RPC: my_listing_stats() — số tin của chính người gọi theo trạng thái + tổng lượt xem.
-- Client: @hp/core home.ts (listBanners, getMyListingStats), hook useBanners, useMyListingStats.
--
-- | Vai trò   | banners select                        | insert / update / delete | my_listing_stats |
-- |-----------|---------------------------------------|--------------------------|------------------|
-- | anon      | đang hiệu lực (is_active, trong khung) | –                        | –                |
-- | user      | đang hiệu lực                          | –                        | tin của mình     |
-- | bị cấm    | đang hiệu lực                          | –                        | tin của mình     |
-- | moderator | đang hiệu lực                          | –                        | tin của mình     |
-- | admin     | tất cả                                 | được                     | tin của mình     |
--
-- Banner lưu chữ đã viết sẵn theo từng locale (admin nhập), không phải khoá i18n: nội dung thay đổi theo đợt,
-- không đi qua deploy. locale null = mọi ngôn ngữ. (supabase/CLAUDE.md mục 4 "Marketing" cập nhật theo file này.)

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('app_home', 'web_home', 'web_listing')),
  locale text check (locale in ('vi', 'en', 'zh')),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  subtitle text check (char_length(subtitle) <= 160),
  cta_label text check (char_length(cta_label) <= 30),
  link_url text check (link_url ~ '^(/[^\s]*|https://[^\s]+)$'),
  image_path text check (image_path ~ '^[\w./-]+\.(webp|jpg|png)$'),
  tone text not null default 'primary'
    check (tone in ('primary', 'accent', 'pass', 'room', 'job', 'lost-found', 'ride', 'sport')),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
comment on table public.banners is 'Banner trang chủ / danh sách (docs/design/home.md §4.4). Chữ viết sẵn theo locale; ảnh trong bucket banners.';
create index banners_placement_idx on public.banners (placement, sort) where is_active;
alter table public.banners enable row level security;
grant select on public.banners to anon, authenticated;
grant insert, update, delete on public.banners to authenticated;   -- policy chỉ cho admin
create trigger trg_banners_updated_at before update on public.banners
  for each row execute function public.set_updated_at();

create policy banners_select_live on public.banners for select to anon, authenticated
  using (
    (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
    or (select public.is_admin())
  );
create policy banners_insert_admin on public.banners for insert to authenticated
  with check ((select public.is_admin()));
create policy banners_update_admin on public.banners for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy banners_delete_admin on public.banners for delete to authenticated
  using ((select public.is_admin()));

-- Mọi thay đổi banner của admin ghi audit_log (luật kiểm duyệt: hành động staff đều có dấu vết).
create or replace function public.trg_banners_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), 'banner.' || lower(tg_op), 'banner', coalesce(new.id, old.id)::text,
          jsonb_build_object('title', coalesce(new.title, old.title), 'placement', coalesce(new.placement, old.placement)));
  return coalesce(new, old);
end;
$$;
revoke execute on function public.trg_banners_audit() from public, anon, authenticated;
create trigger trg_banners_audit after insert or update or delete on public.banners
  for each row execute function public.trg_banners_audit();

-- Bucket ảnh banner: đọc public (CDN), chỉ admin ghi / xoá. Ảnh 16:7, ≤ 1 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('banners', 'banners', true, 1024 * 1024, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists banners_objects_insert_admin on storage.objects;
create policy banners_objects_insert_admin on storage.objects for insert to authenticated
  with check (bucket_id = 'banners' and (select public.is_admin()));
drop policy if exists banners_objects_delete_admin on storage.objects;
create policy banners_objects_delete_admin on storage.objects for delete to authenticated
  using (bucket_id = 'banners' and (select public.is_admin()));
drop policy if exists banners_objects_select_admin on storage.objects;
create policy banners_objects_select_admin on storage.objects for select to authenticated
  using (bucket_id = 'banners' and (select public.is_admin()));

-- ═════════════════════════════════════════════════════════════════════════════
-- my_listing_stats — thẻ "Tin của bạn". security invoker: RLS listings chỉ cho thấy tin của chính mình
-- (staff thấy mọi tin nên lọc thêm owner_id = auth.uid()).
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.my_listing_stats()
returns table (active int, pending int, rejected int, drafts int, expiring_soon int, total_views bigint)
language sql stable security invoker set search_path = '' as $$
  select
    count(*) filter (where status = 'active' and (expires_at is null or expires_at > now()))::int,
    count(*) filter (where status = 'pending_review')::int,
    count(*) filter (where status = 'rejected')::int,
    count(*) filter (where status = 'draft')::int,
    count(*) filter (where status = 'active' and expires_at > now() and expires_at <= now() + interval '3 days')::int,
    coalesce(sum(view_count), 0)::bigint
  from public.listings
  where owner_id = (select auth.uid()) and deleted_at is null;
$$;
comment on function public.my_listing_stats() is 'Số tin của người gọi theo trạng thái + tổng lượt xem (Hub, thẻ "Tin của bạn"). Khách: 0.';
revoke execute on function public.my_listing_stats() from public, anon;
grant execute on function public.my_listing_stats() to authenticated;
