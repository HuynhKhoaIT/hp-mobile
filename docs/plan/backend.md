# Kế hoạch triển khai — supabase/ + packages/ (backend và gói dùng chung)

Cập nhật: 2026-10-30 · Nguồn: `docs/ARCHITECTURE.md` (mục 4, 5, 6, 10, 11, 12, 13), `supabase/CLAUDE.md` · Tổng quan: `docs/PLAN.md` · Khu khác: `docs/plan/mobile.md`, `docs/plan/web.md`

## 1. Mục tiêu và cổng

| Cổng | Thời điểm | Tiêu chí phần backend |
|---|---|---|
| 1. Schema + auth chạy | hết tuần 2 | `supabase db reset` sạch với Core schema; RLS + pgTAP 4 vai trò pass; `send-otp` gửi OTP thật; `packages/*` build; CI xanh |
| 2. Beta 100 người | tuần 6 → 8 | Staging project; Listing + Chat + Notifications + push chạy; `moderate-listing` + `moderation_queue` phục vụ `/admin/moderation`; backup hàng ngày |
| 3. Ra mắt Dung Quất | hết tuần 10 | Đủ schema / RPC / Edge Function cho 6 tính năng; cron chạy; pen-test pass; RPC công khai có index phủ với 50k tin giả |
| 4. Mở rộng khu vực | hết tuần 12 | Production project; secrets; webhook prod; PITR; runbook; thử khôi phục backup |

## 2. Hợp đồng với hai client (nguồn sự thật: `CLAUDE.md` mục 4–9)

Những gì client được phép phụ thuộc. Đổi bất kỳ mục nào → ghi mục 7.

| Loại | Danh sách |
|---|---|
| View công khai (anon) | `public_listings`, `public_profiles`, `public_groups` |
| RPC công khai | `get_listing_by_slug`, `get_group_by_slug`, `search_listings`, `search_groups`, `similar_listings`, `public_stats`, `sitemap_listings`, `home_feed`, `log_search` |
| RPC đã đăng nhập | `reveal_contact`, `check_rate_limit`, `admin_stats` (staff) |
| Edge Function (client gọi) | `join-group`, `respond-join`, `request-badge`, `translate-content` |
| Edge Function (nội bộ) | `send-otp`, `custom-claims`, `send-push`, `match-lost-found`, `moderate-listing`, `expire-content`, `remind-groups` |
| Notification `type` + `data.screen` | `new_message → chat`, `join_request / join_accepted / group_reminder → group`, `listing_approved / listing_rejected / listing_expiring / lost_found_match → listing` |
| Push payload | `{ screen: 'listing' \| 'group' \| 'chat' \| 'notifications', params: { id } }` |
| Webhook ra ngoài | `POST {web}/api/revalidate` header `x-revalidate-secret`, body `{ tag }` |
| JWT claims | `app_metadata.role` (`user \| moderator \| admin`) |
| `@hp/core` | hàm theo domain, `keys`, hooks, `functions.ts`, `capabilities.appOnly`, `urls.ts` |
| `@hp/shared` | Zod theo category / kind / function / action, enums, `format.ts`, `slug.ts`, i18n 9 ns |
| `@hp/tokens` | token màu / chữ / spacing / radius / motion + preset Tailwind |
| Storage | 4 bucket, đường dẫn và giới hạn ở `CLAUDE.md` mục 7 |
| Realtime | publication 4 bảng; Broadcast `conversation:{id}` |

## 3. Phụ thuộc chéo

### 3.1 Backend cần từ hai app
| Tuần | Cần |
|---|---|
| 1 | Hai app cài được `packages/*` qua workspace (`pnpm install` ở gốc) |
| 4 | web: URL `/api/revalidate` + `REVALIDATE_SECRET` cho webhook |
| 6 | Expo access token (push) từ mobile; bundle id để giới hạn key Goong |
| 10 | mobile: cả hai nền tảng test push + deep link với payload chuẩn |

### 3.2 Hai client cần từ backend (tóm tắt, chi tiết ở PLAN của họ)
Tuần 1 token / db / shared → tuần 2 auth + profiles → tuần 3 listing đọc → tuần 4 listing ghi + moderation → tuần 5 chat → tuần 6 notifications + push + staging → tuần 7 group + join → tuần 8 respond / remind / expire / venues → tuần 9 room / lost-found / match → tuần 10 badge / translate / purge → tuần 11 marketing / catalog → tuần 12 production.

## 4. Lộ trình 12 tuần

| Tuần | Việc | Đầu ra kiểm chứng được | Skill |
|---|---|---|---|
| 1 | `supabase init`; `config.toml` (auth phone hook, Google, MFA, redirect URLs, storage limit); extensions `postgis`, `pg_trgm`, `unaccent`, `pg_cron`, `pg_net`; `set_updated_at`, `slugify`; pnpm workspace `packages/{db,shared,tokens,core}` khung + build; `@hp/tokens` đầy đủ + preset Tailwind; `@hp/shared` enums, constants, `format.ts`, `slug.ts`, i18n 9 ns khung; script `i18n:check`; `supabase/tests/_helpers.psql`; CI (db reset + test + gen types diff + build + i18n:check); `.env.example` | `supabase start` + `pnpm -r build` + CI xanh | — |
| 2 | Core: `profiles` (+ trigger từ `auth.users`, consent, guard cột), `sites`, `notifications`, `bookmarks`, `ratings` (+ trigger avg / count / reputation), `badge_requests`, `blocks`, `rate_limits` + `assert_rate_limit`, `audit_log`; helper RLS; `public_profiles`; RLS + pgTAP; `send-otp` (ZNS + fallback SMS, 5 / giờ); `custom-claims` hook; seed user 5 vai trò; gen types; `@hp/core` `SupabaseProvider`, `keys`, `profile.ts`, `notifications.ts`, `bookmarks.ts` | **Cổng 1** | `/new-migration`, `/rls-policy`, `/new-edge-function` |
| 3 | Listing: enum, `listings` (+ trigger slug / short_id / guard status / expires_at mặc định, `search_vector`, 5 index), `listing_translations`, `listing_views`, `search_logs`; `public_listings` (PII, vị trí 300 m, khoảng cách tới site); RLS + pgTAP; bucket `listing-images`, `avatars` + policy; RPC `search_listings`, `get_listing_by_slug`, `similar_listings`, `log_search`; Zod `pass_*`, `job_*`; `@hp/core` `listings.ts` + hooks + `urls.ts` + `capabilities.ts`; seed 50 tin / category | mobile + web list / detail chạy từ seed; `explain` dùng index | `/new-rpc` |
| 4 | `createListing` / `updateListing` / `markSold` (RPC `mark_sold_tx`) / `renewListing`; `moderate-listing` (webhook: `banned_keywords`, tài khoản < 7 ngày, giá < 30% trung vị, từ khoá đặt cọc, ảnh trùng hash, > 10 tin / ngày) + `moderation_queue`; `reveal_contact`; `sitemap_listings`, `public_stats` + `stats_cache`; webhook revalidate → web; `check_rate_limit` | Đăng tin từ hai client; tin rủi ro vào hàng chờ; web ISR cập nhật khi đổi trạng thái | `/new-edge-function`, `/new-rpc` |
| 5 | Chat: `conversations` (direct unique theo listing + cặp user), `conversation_members`, `messages` + trigger `last_message_*` + notification `new_message`; RLS `is_member` + chặn; publication Realtime; bucket `chat-images` + signed URL; Broadcast presence; `@hp/core` `chat.ts` + hooks (optimistic send); `reports`, `blocks` hiệu lực lên view / chat | Chat realtime 2 client; không-member không nhận event | `/rls-policy` |
| 6 | `send-push` (webhook `notifications` insert: Expo, template ns `push` theo locale, gộp 1 phút, xoá token hỏng, bỏ qua web); `notification_prefs`; staging project + GitHub Actions `db push` + `functions deploy` khi merge `main`; `pg_dump` hàng ngày; policy staff cho `moderation_queue`, `audit_log`, `reports` (phục vụ `/admin/moderation` sớm) | **Cổng 2 bắt đầu**: beta chạy trên staging, push tới máy thật | `/new-edge-function` |
| 7 | Group: enums, `groups` (+ trigger slug, conversation, seats / status), `group_members`, `public_groups`; RLS + pgTAP; `search_groups`, `get_group_by_slug`; `join_group_tx` + `join-group`; Zod ride / sport; `@hp/core` `groups.ts` + hooks (optimistic join) | Ghép xe end-to-end; nhóm tự `full` | `/new-rpc`, `/new-edge-function` |
| 8 | `respond_join_tx` + `respond-join`; `remind-groups` (cron 15 phút, notification `group_reminder`); `expire-content` (cron 1 giờ: `expired`, `completed` + mời đánh giá, `listing_expiring` trước 3 ngày); `venues` + RLS (user đóng góp, moderator duyệt); ratings theo context group | **Cổng 2 kết thúc** | `/new-edge-function` |
| 9 | Zod `room_*`, `lost` / `found`; `match-lost-found` (webhook: `item_type`, ±2 ngày, < 2 km, notification cả hai); khoảng cách tới `sites.location` trong `search_listings`; `home_feed` (cùng khu, mới đăng, danh mục hay xem từ `listing_views`); trigger 3 báo cáo / 24h → ẩn tạm | 6 tính năng data-complete | `/new-rpc` |
| 10 | `request-badge` + bucket `verification` + policy + cron `purge-verification-files`; `translate-content` (cache `listing_translations`); cron `purge-deleted-accounts` (Nghị định 13); `admin_stats`; `/be-done-check --pentest` lần 1 | **Cổng 3**: pen-test pass | `/be-done-check` |
| 11 | Marketing: `marketing_leads` (insert service role, rate limit IP), `banners`; catalog: `sites` / `venues` / `banned_keywords` ghi cho admin; RPC xuất CSV audit (admin, ghi audit); nạp 50k tin giả → `explain analyze` mọi RPC công khai, thêm index thiếu; review schema + RLS bởi người thứ hai (ARCHITECTURE mục 12) | Mọi RPC công khai < 50 ms p95 trên 50k tin | `/be-done-check` |
| 12 | Production project (Singapore): migrate, `secrets set`, Auth redirect domain thật, webhook prod, PITR 7 ngày, Sentry; `docs/RUNBOOK.md` (deploy, rollback, khôi phục backup, xoay secret, thêm moderator); thử khôi phục backup; `/be-done-check --pentest` lần 2 trên staging | **Cổng 4** | `/be-done-check` |

### Tiến độ tuần 1 (cập nhật 2026-10-30)
- [x] `supabase init`, link `dungquat-staging`; Supabase local chạy (Postgres 17.11, khớp staging)
- [x] `config.toml` local: OTP SĐT + số test 84900000001–05 (OTP `123456`), TOTP, redirect URLs, storage 5 MiB, image transformation
- [x] Migration 0001: `postgis`, `pg_trgm`, `unaccent`, `pg_cron`, `pg_net`; `set_updated_at`, `slugify`, `gen_short_id`; bỏ quyền mặc định
- [x] `supabase/tests/_helpers.psql` + `000_foundation.test.sql` (18 assertion)
- [x] `@hp/tokens` đầy đủ + `theme.css`; `@hp/shared` enums, constants, `format.ts`, `slug.ts`, i18n 9 ns; `node --test` (9 test)
- [x] CI: job `db` (reset, pgTAP, type diff) + unit test + kiểm tra file sinh
- [ ] Đăng nhập Google (cần OAuth client) · `[auth.hook.send_sms]` → `send-otp` · `custom-claims` → tuần 2
- [ ] Màu dịch vụ `serviceColors` là đề xuất, chờ duyệt

## 5. Thứ tự migration dự kiến
`0001_extensions_helpers` → `0002_core_profiles_sites` → `0003_core_notifications_bookmarks_ratings` → `0004_core_moderation_tables` → `0005_rls_helpers_core_policies` → `0006_listings` → `0007_listings_public_view_rpc` → `0008_storage_buckets_listing_avatars` → `0009_listing_write_rpc_moderation_webhook` → `0010_chat` → `0011_realtime_publication_chat_storage` → `0012_push_webhook_notification_prefs` → `0013_groups` → `0014_group_rpc_join` → `0015_cron_expire_remind` → `0016_venues` → `0017_lost_found_match_webhook` → `0018_home_feed_reports_auto_hide` → `0019_verification_translations_purge` → `0020_marketing_catalog_admin` → `0021_app_settings_local`. Tên thật theo timestamp của `supabase migration new`.

## 6. Hạ tầng kỹ thuật
- **Môi trường**: local (CLI Docker) → `dungquat-staging` → `dungquat-prod`. Secrets: `ZNS_API_KEY`, `SMS_FALLBACK_KEY`, `EXPO_ACCESS_TOKEN`, `TRANSLATE_API_KEY`, `GOONG_SERVER_KEY`, `SENTRY_DSN`, `WEBHOOK_SECRET`, `CRON_SECRET`, `WEB_REVALIDATE_SECRET`; `app.*` settings trong DB cho cron / webhook.
- **CI** (GitHub Actions): PR → `supabase start` + `db reset` + `test db` + gen types diff + `pnpm -r build` + `i18n:check` + `deno test`; merge `main` → `db push` + `functions deploy` lên staging; tag `v*` → prod (cần approval thủ công).
- **Self-host dự phòng**: docker-compose chính thức, không đổi code; `pg_dump` hàng ngày ra object storage khác, giữ 7 ngày.
- **Quan sát**: Sentry mọi function (`request_id`), log PostgREST slow query > 200 ms, dashboard Supabase cho connection / Realtime.

## 7. Thay đổi hợp đồng (log)
Ghi mỗi khi mục 2 đổi. Client đọc bảng này để biết phải cập nhật gì.

| Ngày | Mục | Thay đổi | Việc ở mobile | Việc ở web | Trạng thái |
|---|---|---|---|---|---|
| 2026-10-30 | `@hp/shared` | Mới: `LOCALES`, enums (`LISTING_CATEGORIES`, `GROUP_SUB_KINDS`…), `APP_NAME`, `EXPIRES_DAYS`, `RATE_LIMITS`, `NOTIFICATION_SCREENS`, `format*`, `toSlug` / `buildSlug` / `parseShortId`; i18n 9 ns (`common` có `category.*`, `status.*`, `feature.*`, `actions.*`, `disclaimer`; `errors` mã chung) | dùng `@hp/shared/format` trong `src/lib/format.ts` | dùng `@hp/shared/format`, `parseShortId` cho `/tin/[slug]` | xong |
| 2026-10-30 | `@hp/tokens` | Mới: token TS + `theme.css` (Tailwind v4). Tên class: `text-fg`, `text-muted`, `bg-surface-2`, `bg-primary-light` (xem `.claude/rules/be-shared-packages.md`) | NativeWind chưa nối — chọn bản NativeWind hợp Tailwind v4 | đã nối `globals.css` | xong (web) |
| 2026-10-30 | DB | Migration `20261030090000_extensions_helpers`: extensions, `slugify`, `gen_short_id`, `set_updated_at`; **bỏ quyền mặc định** (mọi bảng / function mới cần `grant` rõ) | — | — | xong |

## 8. Rủi ro riêng backend
| Rủi ro | Giảm thiểu |
|---|---|
| RLS sót → lộ PII cho anon (web index Google) | View công khai là lối duy nhất cho anon; pgTAP bắt buộc; pen-test tuần 10 và 12; người thứ hai review |
| Logic trùng trigger / Edge Function gây notification đôi | Phân công cố định ở `rpc-triggers-cron.md`; grep trong `/be-done-check` |
| OTP bị spam tốn tiền | `assert_rate_limit` 5 / số / giờ ở `send-otp`; cảnh báo chi phí ZNS |
| Hai app lệch với gói sau khi đổi API | `/shared-package-change` build cả hai trong cùng PR; log mục 7; CI chặn khi `tsc` app lỗi |
| Migration sửa tay trên Studio rồi quên | Chỉ migration file; CI `db reset` từ đầu; `supabase db diff` phải rỗng |
| Tìm kiếm chậm khi tin tăng | Index phủ + `explain` với 50k tin tuần 11; Meilisearch khi > 500k |

## 9. Sau MVP
Meilisearch đồng bộ qua webhook; tách `send-push` ra service riêng khi > 50k người dùng; ví MoMo / ZaloPay (bảng `transactions`, Edge Function `payment-webhook`); mini-app mới = thêm `category` / `kind` + Zod + config, không đổi lõi.
