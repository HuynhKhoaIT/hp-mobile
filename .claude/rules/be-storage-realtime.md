---
paths:
  - "supabase/migrations/**"
  - "supabase/config.toml"
---

# Storage, Realtime, Auth config

## Bucket (tạo trong migration qua `insert into storage.buckets`)
| Bucket | public | file_size_limit | allowed_mime_types | Đường dẫn |
|---|---|---|---|---|
| `listing-images` | true | 2 MB | image/webp, image/jpeg | `{user_id}/{listing_id}/{n}.webp` |
| `avatars` | true | 1 MB | image/webp, image/jpeg | `{user_id}.webp` (512px) |
| `verification` | false | 5 MB | image/webp, image/jpeg, application/pdf | `{user_id}/{badge}/{ts}.webp` |
| `chat-images` | false | 2 MB | image/webp, image/jpeg | `{conversation_id}/{message_id}.webp` |

Policy trên `storage.objects` theo bucket:
- Ghi: `bucket_id = '<b>' and (storage.foldername(name))[1] = auth.uid()::text and not is_banned()`.
- `verification`: select chỉ `is_staff()` hoặc chủ; xoá tự động 30 ngày sau `badge_requests.reviewed_at` (cron `purge-verification-files`).
- `chat-images`: select khi `is_member(((storage.foldername(name))[1])::uuid)`; client dùng signed URL 1 giờ.
- Không cho `update` object (ghi đè); upload tên mới. `delete` chỉ chủ hoặc staff.
- Transform: client dùng `?width=400&quality=75` (thumb) / `?width=1280` (detail); helper `imageUrl(path, size)` ở `packages/core/src/urls.ts`.

## Realtime
- Publication `supabase_realtime` chỉ: `messages`, `group_members`, `groups`, `notifications`. Thêm bảng = migration + lý do trong comment.
- `replica identity full` chỉ khi client cần `old` record (hiếm). RLS áp dụng cho Realtime → test tài khoản không phải member không nhận event.
- Presence / đang gõ: Broadcast channel `conversation:{id}`, không ghi DB.
- Giới hạn client: 1 kết nối / thiết bị, ≤ 5 kênh.

## `config.toml`
- `[auth]`: `enable_signup = true`, `jwt_expiry = 3600`, `enable_refresh_token_rotation = true`; `[auth.sms]` bật + `[auth.hook.send_sms]` trỏ `send-otp`; `[auth.external.google]` bật; `[auth.mfa.totp]` bật (admin web); `site_url` + `additional_redirect_urls` gồm `http://localhost:3000/**`, `https://tenapp.vn/**`, `https://*.vercel.app/**`, `hoaphat://**`, `exp://**`.
- Custom claim `app_metadata.role` qua Auth Hook `custom_access_token` → Postgres function `public.custom_access_token_hook` (`pg-functions://postgres/public/custom_access_token_hook`); staging / prod bật trên Dashboard → Auth → Hooks.
- `[storage]` `file_size_limit` khớp bảng trên; image transformation bật.
- `[functions.<name>] verify_jwt = false` chỉ cho webhook / cron / auth hook (tự kiểm tra secret trong `handler`).
- `[db.pooler]` bật transaction mode cho Edge Functions.
