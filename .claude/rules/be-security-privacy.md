---
paths:
  - "supabase/**"
  - "packages/core/**"
---

# Bảo mật và dữ liệu cá nhân

- Service role key chỉ ở Edge Functions (`admin` trong `handler`) và server admin của web; không ở `packages/*`, không ở app, không trong git.
- PII (`phone`, `push_tokens`, `notification_prefs`, email, ảnh giấy tờ, vị trí chính xác nhà) không qua view / RPC công khai. `reveal_contact(listing_id)` yêu cầu đăng nhập, rate limit 20 / giờ, ghi `audit_log('contact.reveal')`.
- Vị trí công khai làm tròn ~300 m (`ST_SnapToGrid(location::geometry, 0.003)`); vị trí chính xác chỉ chủ tin + staff.
- Rate limit (`rate_limits`, helper `assert_rate_limit` SQL + `assertRateLimit` Deno): 10 tin / ngày; 50 tin nhắn / giờ cho tài khoản < 7 ngày; 5 OTP / số / giờ; 3 báo cáo / giờ; lead 5 / IP / giờ; `reveal_contact` 20 / giờ. Vượt → `errors.rate_limited` (429 / `P0001`).
- Nghị định 13/2023: `profiles.consent_at` + `consent_version` khi đăng ký (trigger từ `auth.users` + onboarding); xoá tài khoản = `deleted_at` + ẩn mọi nội dung ngay (view lọc), cron xoá cứng sau 30 ngày (profiles, listings, ảnh Storage; messages ẩn danh hoá `sender_id = null`).
- `audit_log` chỉ insert; không update / delete cho bất kỳ role nào; select chỉ admin; xuất CSV qua RPC admin có ghi audit.
- Không xoá cứng tin vi phạm: `status = 'rejected'` + `moderation_queue`.
- Log Edge Function không ghi SĐT, OTP, token, nội dung tin nhắn; Sentry `beforeSend` xoá PII.
- Secrets: `supabase secrets set` / GitHub Secrets; `.env.example` liệt kê tên; không file `.env` trong git (`.gitignore` có `supabase/.env*`).
- Backup: `pg_dump` hàng ngày ra nơi khác, giữ 7 ngày, PITR 7 ngày trên prod; thử khôi phục mỗi quý (ghi `docs/RUNBOOK.md`).
- Trước khi ra mắt: `/be-done-check --pentest` — thử từng bảng với anon / user khác chủ / banned, Storage policy, OTP rate limit, Realtime leak. Bất kỳ "được" nào là lỗi chặn ra mắt.
