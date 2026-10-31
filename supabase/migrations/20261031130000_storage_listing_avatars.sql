-- Storage: bucket listing-images + avatars (tuần 3; .claude/rules/be-storage-realtime.md)
-- Mục đích: ảnh tin đăng và ảnh đại diện. Đọc public (CDN), ghi chỉ vào thư mục của chính mình.
-- Client: app ImagePicker → nén webp → upload; @hp/core imageUrl(); onboarding avatar.
--
-- | Vai trò       | đọc        | upload                               | ghi đè | xoá          |
-- |---------------|------------|--------------------------------------|--------|--------------|
-- | anon          | public URL | –                                    | –      | –            |
-- | user          | public URL | thư mục {auth.uid()}/…, không bị cấm | –      | file của mình |
-- | user bị cấm   | public URL | –                                    | –      | file của mình |
-- | moderator     | public URL | như user                             | –      | mọi file     |
-- Không cho update (ghi đè): upload tên mới (cache CDN không giữ ảnh cũ). Avatar: {user_id}/{timestamp}.webp.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('listing-images', 'listing-images', true, 2 * 1024 * 1024, array['image/webp', 'image/jpeg']),
  ('avatars',        'avatars',        true, 1 * 1024 * 1024, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists listing_images_insert_own on storage.objects;
create policy listing_images_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_banned())
  );

drop policy if exists listing_images_delete_own_or_staff on storage.objects;
create policy listing_images_delete_own_or_staff on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_staff()))
  );

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_banned())
  );

drop policy if exists avatars_delete_own_or_staff on storage.objects;
create policy avatars_delete_own_or_staff on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_staff()))
  );

-- Bucket public: đọc qua /storage/v1/object/public/… không cần policy select. Thêm policy select cho chủ file
-- để upload trả về metadata (supabase-js đọc lại object sau khi tạo).
drop policy if exists listing_avatars_select_own on storage.objects;
create policy listing_avatars_select_own on storage.objects for select to authenticated
  using (
    bucket_id in ('listing-images', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
