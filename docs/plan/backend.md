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
| Edge Function (nội bộ) | `send-otp`, `send-push`, `match-lost-found`, `moderate-listing`, `expire-content`, `remind-groups` |
| Notification `type` + `data.screen` | `new_message → chat`, `join_request / join_accepted / group_reminder → group`, `listing_approved / listing_rejected / listing_expiring / lost_found_match → listing` |
| Push payload | `{ screen: 'listing' \| 'group' \| 'chat' \| 'notifications', params: { id } }` |
| Webhook ra ngoài | `POST {web}/api/revalidate` header `x-revalidate-secret`, body `{ tag }` |
| JWT claims | `app_metadata.role` (`user \| moderator \| admin`) — hook Postgres `custom_access_token_hook` |
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
- [ ] Đăng nhập Google (cần OAuth client) · `[auth.hook.send_sms]` → `send-otp` → tuần 2
- [x] Màu dịch vụ `serviceColors`: tông dịu, `fg` + `soft`, light + dark, tương phản ≥ 3:1 (chọn 2026-10-30)

### Tiến độ tuần 2 — phần đăng nhập dùng chung (cập nhật 2026-10-31)
- [x] Migration `20261031100000_profiles_interests`: `profiles.interests` (CHECK theo FEATURES), không vào `public_profiles`; pgTAP 84
- [x] Seed: `0900000002` là tài khoản mới chưa onboarding (thử màn onboarding); các số khác đã đồng ý điều khoản
- [x] `@hp/shared`: `normalizeVnPhone` / `toE164` / `formatVnPhone` (+ test), `PhoneInput`, `OtpInput`, `FEATURES`, `CONSENT_VERSION`, `OTP_LENGTH`, `OTP_RESEND_SECONDS`; i18n `auth`, lỗi `phone_invalid` / `otp_invalid` / `sms_failed`, `common.nav`, `common.states`, `common.locale`
- [x] `@hp/core`: `sendPhoneOtp`, `verifyPhoneOtp`, `signInWithGoogle`, `exchangeCodeForSession`, `signOut`, `needsOnboarding`, `toAuthError`; entry `@hp/core/react` (provider + hook). Đã chạy thật với Supabase local: số sai, mã sai, đăng nhập, onboarding, đăng xuất
- [ ] **`send-otp` (Auth Hook gửi SMS / Zalo ZNS) — chờ chọn nhà cung cấp** (tài khoản Zalo OA + ZNS template, hoặc SMS brandname). Chưa có thì staging không gửi được SMS thật: dùng số test của Supabase (Dashboard → Authentication → Providers → Phone → Test phone numbers)
- [x] Quyết định 2026-10-31: chưa đăng ký được SMS → **OTP cố định `123456` qua số test của Supabase** (local `[auth.sms.test_otp]`, staging trên Dashboard, xem `docs/RUNBOOK.md`); thêm số `84900000010–19` (tài khoản mới) để thử onboarding. Không code đường đăng nhập riêng; client không đổi gì khi `send-otp` lên. Chặn ra prod cho tới khi có `send-otp`
- [ ] Google OAuth: chờ OAuth client (Google Cloud) → bật provider trên Supabase local / staging; code app + web đã sẵn

### Tiến độ tuần 2 (cập nhật 2026-10-30)
- [x] Migration `20261030100000_core`: `sites`, `profiles` (+ trigger tạo từ `auth.users`, guard cột, consent), `ratings` (+ trigger avg / count), `notifications` (Realtime, chỉ sửa `read_at`), `bookmarks`, `badge_requests` (+ trigger duyệt), `blocks`, `rate_limits` + `assert_rate_limit`, `audit_log` (chỉ thêm); helper `is_staff`, `is_admin`, `is_banned`, `is_blocked`, `short_name`; view `public_profiles`
- [x] Hook JWT `custom_access_token_hook` (Postgres) — đã thử: JWT moderator có `app_metadata.role = moderator`
- [x] Seed: 5 user (user, user, banned, moderator, admin), SĐT `84900000001–05`
- [x] pgTAP: `010_profiles` (27) + `020_core_tables` (30), tổng 75 assertion; thử thật qua REST + supabase-js
- [x] `@hp/core`: `Result` / `toAppError`, `keys`, profile (`getMyProfile`, `updateMyProfile`, `completeOnboarding`, `getPublicProfile`), sites, notifications (cursor), bookmarks, blocks, `shareUrl`, `imageUrl`; `@hp/shared`: Zod `UpdateProfileInput`, `OnboardingInput`
- [ ] `send-otp` (cần tài khoản Zalo ZNS / SMS brandname) · Google OAuth · `ratings` insert qua RPC (tuần 6 / 8) · bật hook trên staging
- [x] Migration `20261031090000_sites_dung_quat`: chỉ khu Dung Quất (4 địa điểm khởi đầu); `sites` + `is_active`, `sort_order`, `updated_at`, trigger audit — admin tự thêm công ty / khu mới ở `/admin/catalog` (màn web tuần 10). pgTAP tổng 81

### Tiến độ tuần 3 — Listing đọc (cập nhật 2026-10-31)
- [x] Migration `20261031110000_listings`: enum `listing_category` / `listing_status`, `listings` (+ trigger `trg_listings_identity` slug / short_id / expires_at, `trg_listings_guard`), `f_unaccent`, 7 index; `listing_translations`, `listing_views` + `record_listing_view`, `search_logs` + `log_search`
- [x] Migration `20261031120000_public_listings`: view `public_listings` (che PII, vị trí 300 m, khoảng cách tới khu, ẩn tin người bị cấm / chặn hai chiều); RPC `search_listings` (full-text không dấu + trigram + chuỗi con cho tiếng Trung, khu, bán kính, giá, attributes, cursor, kẹp 50), `get_listing_by_slug`, `similar_listings`
- [x] Migration `20261031130000_storage_listing_avatars`: bucket `listing-images` (2 MB), `avatars` (1 MB), ghi chỉ thư mục của mình, bị cấm không upload, không ghi đè
- [x] Seed `supabase/seed/listings.sql`: 500 tin (50 / category), vi / en / zh, vài tin sold / draft / expired, 2 tin / category của user bị cấm (phải ẩn). Chưa có ảnh: client hiện ảnh giữ chỗ
- [x] pgTAP `030_listings` (47): anon / chủ / người khác / bị cấm / moderator, guard, slug, chặn, lượt xem, Storage. Tổng 131
- [x] **Sửa lỗi bảo mật trong mẫu RLS**: policy staff `with check (true)` mở update cho mọi người (Postgres OR các with check của policy permissive) → `with check (is_staff())`; đã sửa `.claude/rules/be-rls.md`; migration cũ không mắc
- [x] Explain (seed 500 tin): list theo category 0,5 ms, list chung 2 ms. Lọc bán kính tính trên vị trí đã làm tròn (không dò được vị trí thật bằng cách thu nhỏ bán kính) nên không dùng GIST — đo lại với 50k tin ở tuần 11
- [x] `@hp/shared`: `ATTRIBUTE_FIELDS` + `ListingAttributes` (Zod 10 category), `readAttributes`, `ListingFilters`, `priceLabel`, `featureOfCategory`; i18n `listing` (hub, list, card, detail, attr, attr_value, unit); lỗi `file_too_large`, `upload_failed`, `file_type`
- [x] `@hp/core`: `searchListings`, `getListingBySlug`, `getListing`, `similarListings`, `recordListingView`, `logSearch`, `LISTING_COLUMNS`, `uploadAvatar`, `avatarUrl`, `LISTING_FEATURE_PATHS`; hook `useListingList`, `useListing`, `useListingBySlug`, `useSimilarListings`, `useRecordListingView`, `useUploadAvatar`. Đã chạy thật với Supabase local (phân trang, slug, not_found, upload avatar + chặn thư mục người khác + quá 1 MB)

### Tiến độ tuần 4 — Listing ghi (cập nhật 2026-11-01)
- [x] Migration `20261101090000_listing_write_moderation`: `banned_keywords` (14 từ khởi đầu), `moderation_queue`, `listings.moderation_reasons`; trigger `trg_listings_moderate` (10 tin / 24 giờ, từ khoá reject / review theo ranh giới từ, tài khoản < 7 ngày, giá < 30% trung vị) + `trg_listings_queue`; RPC `review_listing`, `renew_listing`, `reveal_contact` (20 / giờ, audit)
- [x] **Quyết định**: kiểm duyệt nội dung là trigger đồng bộ, không Edge Function `moderate-listing` qua webhook — tin rủi ro không lộ công khai dù vài giây, test bằng pgTAP, không cần deploy function. `moderate-listing` chỉ còn phần ảnh trùng hash (sau)
- [x] **Sửa lỗi tuần 3**: `trg_listings_identity` gọi `gen_short_id` đã thu quyền → user đăng tin thật sẽ lỗi `permission denied` (pgTAP tuần 3 không bắt được vì plpgsql giữ biểu thức đã khởi tạo bằng quyền postgres) → `security definer`. `slug` / `short_id` có default rỗng (trigger ghi đè) để type Insert không bắt client gửi
- [x] Migration `20261101100000_public_listings_lifecycle`: `public_listings` thêm tin sold / closed / expired + `is_expired`, `inactive_since` (trang chi tiết 200 + nhãn, 410 sau 30 ngày); `search_listings` / `similar_listings` chỉ tin active; `sitemap_listings(p_page)`, `public_stats()`; `app_settings` + `app_setting()`; webhook `trg_listings_revalidate` (pg_net → `/api/revalidate`, body `{tags}`)
- [x] Seed: tin mẫu lùi > 24 giờ (không chạm giới hạn 10 tin / ngày khi thử), hồ sơ seed có tuổi bằng `auth.users` (0900000002 vẫn là tài khoản mới); `app_settings` local trỏ `http://host.docker.internal:3000/api/revalidate`
- [x] pgTAP `040_listing_write` (44). Tổng 175
- [x] `@hp/shared`: `CreateListingInput`, `UpdateListingInput` (attributes theo category, giá bắt buộc khi giá cố định trừ việc / thất lạc), `ListingImagePath`, `MAX_LISTING_IMAGES`, `priceRequired`, `OWNER_LISTING_STATUSES`; i18n `listing.form|manage|saved|contact|state|bookmark`, `push.listing_approved|rejected`, lỗi `too_short`, `price_required`, `too_many_images`, `too_early`
- [x] `@hp/core`: `createListing`, `updateListing`, `setListingStatus`, `deleteListing`, `renewListing`, `revealContact`, `listMyListings`, `getMyListing`, `uploadListingImage`, `removeListingImages`, `listSavedListings`, `listingDisplayStatus`, `isListingGone`; hook `useCreateListing`, `useUpdateListing`, `useUploadListingImage`, `useMyListings`, `useMyListing`, `useSetListingStatus` / `useDeleteListing` / `useToggleBookmark` (optimistic + rollback), `useRenewListing`, `useRevealContact`, `useBookmarkedListingIds`, `useSavedListings`; key `myListings(tab)`, `myListing(id)`, `savedListings()`. Đã chạy thật qua PostgREST
- [ ] Màn duyệt tin cho moderator (`/admin/moderation`) — cần đăng nhập admin + MFA (tuần 10); tạm thời gọi `review_listing` theo `docs/RUNBOOK.md`
- [ ] Lưu ý vận hành: mọi tài khoản < 7 ngày đều vào hàng chờ → lúc mới ra mắt gần như mọi tin cần duyệt tay; luật "giá < 30% trung vị" theo category rộng (vd nội thất) dễ bắt nhầm — xem lại ngưỡng khi có dữ liệu thật

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
| 2026-11-01 | DB + `@hp/shared` + `@hp/core` | Listing ghi: hàm + hook đăng / sửa / trạng thái / xoá / gia hạn / hiện SĐT / tin của tôi / lưu tin; `CreateListingInput` / `UpdateListingInput`. **`public_listings` nay gồm cả tin sold / closed / expired** (cột mới `is_expired`, `inactive_since`; `LISTING_COLUMNS` thêm 2 cột) — đọc trực tiếp view phải tự lọc `status = 'active' and not is_expired`; RPC danh sách đã lọc. `keys.myListings(tab)` | form đăng tin, tin của tôi, lưu tin, hiện SĐT, nhãn đã bán | `/dang-tin`, `/toi` tin của tôi, `/tin/[slug]` 200 + nhãn / 410, `/api/revalidate`, sitemap | xong (DB + gói) |
| 2026-10-31 | DB + `@hp/shared` + `@hp/core` | Listing đọc: view `public_listings`, RPC `search_listings` / `get_listing_by_slug` / `similar_listings` / `record_listing_view` / `log_search`; bucket `listing-images`, `avatars` (path `{user_id}/{timestamp}.webp`, `profiles.avatar_url` lưu path). Shared: `ATTRIBUTE_FIELDS`, `ListingAttributes`, `readAttributes`, `ListingFilters`, `priceLabel`, `featureOfCategory`, i18n `listing`. Core: hàm + hook đọc tin, `uploadAvatar`, `avatarUrl`, `keys.listingBySlug` / `similarListings` | Hub, list 4 tính năng, chi tiết, `ListingCard`, avatar onboarding | `/pass-do`, `/tro`, `/viec-lam`, `/that-lac`, `/tin/[slug]` (SEO), `listing-card`, avatar onboarding | xong (DB + gói) |
| 2026-10-31 | DB + `@hp/shared` + `@hp/core` | `profiles.interests`; schema `PhoneInput` / `OtpInput`; hàm auth (`sendPhoneOtp`, `verifyPhoneOtp`, `signInWithGoogle`, `exchangeCodeForSession`, `signOut`, `needsOnboarding`); **`SupabaseProvider` chuyển sang `@hp/core/react`**; `keys.me(userId)`; `common.locale` thay `web.locale`; token `aspect` (`aspect-card`, `aspect-avatar`) | import provider từ `@hp/core/react`; màn phone / otp / onboarding | `/dang-nhap`, `/auth/callback`, LoginDialog | xong |
| 2026-10-31 | `@hp/tokens` + i18n `web` | Token mới `onAccent` (chữ tối trên nút cam, tương phản 6,3:1 thay vì 2,8:1 của chữ trắng). Namespace `web`: `meta`, `header`, `theme`, `locale`, `footer`, `home`, `dev` | `Text` có tone `onAccent` | `Button` `accent` dùng `text-on-accent`; header / footer dùng ns `web` | xong |
| 2026-10-31 | `@hp/core` + `@hp/tokens` | `@hp/core`: `SupabaseProvider`, `useSupabase` (peer `react >= 19`). `@hp/tokens`: sinh thêm `tailwind.preset.cjs` (export `@hp/tokens/tailwind.preset`) cho NativeWind 4, CI kiểm file đã sinh lại | `AppProviders` dùng `SupabaseProvider`; NativeWind dùng preset | bọc `SupabaseProvider` khi thêm hook TanStack dùng chung | xong |
| 2026-10-31 | DB + `@hp/core` | Migration `20261031090000_sites_dung_quat`: `sites` chỉ còn khu Dung Quất (`hoa_phat_dung_quat`, `cang_dung_quat`, `vsip_quang_ngai`, `hyundai_eco_vina`; mã `dung_quat` bỏ); cột `is_active`, `sort_order`; policy select chỉ khu đang hiện (admin thấy hết); audit trigger. `listSites` lọc `is_active`, sắp `sort_order` | onboarding chọn khu từ `listSites` (không hard-code mã) | `/admin/catalog` quản lý sites (tuần 10) | xong (DB) |
| 2026-10-30 | `@hp/shared` | Mới: `LOCALES`, enums (`LISTING_CATEGORIES`, `GROUP_SUB_KINDS`…), `APP_NAME`, `EXPIRES_DAYS`, `RATE_LIMITS`, `NOTIFICATION_SCREENS`, `format*`, `toSlug` / `buildSlug` / `parseShortId`; i18n 9 ns (`common` có `category.*`, `status.*`, `feature.*`, `actions.*`, `disclaimer`; `errors` mã chung) | dùng `@hp/shared/format` trong `src/lib/format.ts` | dùng `@hp/shared/format`, `parseShortId` cho `/tin/[slug]` | xong |
| 2026-10-30 | `@hp/tokens` | Mới: token TS + `theme.css` (Tailwind v4). Tên class: `text-fg`, `text-muted`, `bg-surface-2`, `bg-primary-light` (xem `.claude/rules/be-shared-packages.md`) | NativeWind chưa nối — chọn bản NativeWind hợp Tailwind v4 | đã nối `globals.css` | xong (web) |
| 2026-10-30 | DB + `@hp/core` | Migration `20261030100000_core` (bảng Core, `public_profiles`, hook JWT). `@hp/core` mới: `Result`, `keys`, profile, sites, notifications, bookmarks, blocks, `shareUrl`, `imageUrl` | dùng `getMyProfile`, `completeOnboarding` ở onboarding; `setBookmark` cho tim lưu tin | dùng `getPublicProfile` cho `/u/[id]`; middleware đọc `app_metadata.role` | xong |
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
