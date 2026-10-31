# CLAUDE.md — Backend (Supabase: Postgres, Auth, Storage, Realtime, Edge Functions)

> Đặt file này tại `supabase/CLAUDE.md`. Tài liệu kiến trúc đầy đủ: `docs/ARCHITECTURE.md` (mục 4, 5, 6, 10, 11). Khi có mâu thuẫn, file này thắng cho phần backend.

## 1. Bối cảnh

Super app cộng đồng (app cá nhân, độc lập) cho người lao động quanh các khu liên hợp Hòa Phát: Pass đồ, Tìm trọ, Tìm việc, Đồ thất lạc (mẫu **Listing**); Ghép xe, Ghép trận thể thao (mẫu **Group**). Client chạy **song song**: app Expo (iOS/Android) và web Next.js (marketing `/`, khu người dùng đầy đủ tính năng, quản trị `/admin`). Cả hai gọi thẳng Supabase, cùng tài khoản, cùng dữ liệu; logic gọi dữ liệu dùng chung nằm ở `packages/core`. Không có server riêng.

Ai có số điện thoại đều đăng ký được bằng OTP. Xác minh là **tùy chọn**, chỉ cho huy hiệu (`badges`). App **không** kết nối dữ liệu nhân sự của bất kỳ công ty nào.

Ngôn ngữ người dùng: `vi | en | zh` (`profiles.locale`).

## 2. Nguyên tắc phân tầng (bắt buộc)

| Tầng | Dùng cho | Không dùng cho |
|---|---|---|
| PostgREST (API tự sinh) | CRUD đơn giản từ client, bảo vệ bằng RLS | logic nhiều bước, gọi dịch vụ ngoài |
| Postgres function (RPC) | đọc phức tạp: tìm kiếm, gợi ý, thống kê (`stable`, `security invoker`) | gửi push, gọi API ngoài |
| Trigger | ràng buộc dữ liệu, đếm, `updated_at`, tạo notification, tạo conversation nhóm | logic chậm hoặc gọi mạng |
| Edge Function (Deno/TS) | cần secret, nhiều bước trong một transaction, gọi dịch vụ ngoài (OTP, push, dịch, Goong) | CRUD đơn giản |
| pg_cron | hết hạn tin, đóng nhóm, nhắc giờ | |

Quy tắc: **không viết endpoint cho CRUD**. Một logic chỉ nằm ở **một** tầng — không lặp ở trigger và Edge Function.

## 3. Cấu trúc thư mục

```
supabase/
├── config.toml
├── migrations/               # YYYYMMDDHHMMSS_<mô_tả>.sql — chỉ thêm, không sửa file đã merge
├── functions/
│   ├── _shared/              # supabaseAdmin.ts, cors.ts, errors.ts, zod schemas re-export, i18n push templates
│   ├── send-otp/
│   ├── request-badge/
│   ├── join-group/
│   ├── respond-join/
│   ├── send-push/
│   ├── match-lost-found/
│   ├── moderate-listing/
│   ├── translate-content/
│   ├── expire-content/
│   └── remind-groups/
├── tests/                    # pgTAP: *.test.sql cho RLS và trigger
└── seed.sql                  # venues, 50 tin mẫu mỗi category, user test mỗi vai trò
packages/db/                  # database.types.ts sinh tự động — không sửa tay
packages/shared/              # Zod schemas, enums, i18n — dùng chung app, web & Edge Functions
packages/core/                # hàm gọi Supabase + query keys + hooks dùng chung app & web (đổi RPC/bảng → cập nhật ở đây)
```

## 4. Schema (nguồn sự thật — cập nhật file này khi đổi schema)

Quy ước chung: mọi bảng có `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at` (trigger `set_updated_at`); dữ liệu người dùng xoá mềm bằng `deleted_at`. Enum dùng Postgres enum type. Vị trí dùng `geography(point, 4326)`. Tiền là `numeric(14,0)` VND.

Extensions: `postgis`, `pg_trgm`, `unaccent`, `pg_cron`, `pg_net`.

### Core (migration `20261030100000_core.sql`)
- `profiles` (id = `auth.users.id`, tạo bởi trigger `trg_auth_users_new_profile`): `phone` (`849…`, null nếu Google), `full_name ≤80`, `avatar_url`, `site` → `sites.code`, `interests text[]` (mã `@hp/shared` FEATURES: pass, room, job, lostFound, ride, sport — onboarding), `department`, `badges text[]` (`phone | worker | landlord | venue | employer`; `phone` gán khi đăng ký bằng SĐT), `locale` (`vi|en|zh`), `reputation_score`, `rating_avg`, `rating_count`, `home_location`, `is_banned` (cấm vĩnh viễn, chỉ admin), `banned_until` (khoá tạm, staff), `role` (`user | moderator | admin`, chỉ admin), `push_tokens text[]`, `notification_prefs jsonb`, `consent_at`, `consent_version`, `deleted_at`. Trigger `trg_profiles_guard` chặn client đổi `phone`, `rating_*`, `reputation_score`; `badges` / `banned_until` chỉ staff; `role` / `is_banned` chỉ admin.
- `sites(code pk, name, location, is_active, sort_order, updated_at)` — danh mục địa điểm làm việc (khởi đầu: Hòa Phát Dung Quất, Cảng Dung Quất, VSIP Quảng Ngãi, Hyundai Eco Vina), **admin quản lý** ở `/admin/catalog`; anon / user chỉ thấy `is_active`, admin thấy hết; chỉ admin ghi; trigger `trg_sites_audit` ghi `audit_log` (`site.create / update / delete`). Ẩn thay vì xoá.
- `venues` — sân thể thao: `name`, `sports text[]`, `location`, `price_ref`, `phone`, `status` (moderator duyệt).
- `ratings(rater_id, ratee_id, context_type listing|group, context_id, score 1–5, comment ≤500)` unique `(rater_id, context_type, context_id)`; trigger cập nhật `profiles.rating_avg / rating_count`. **Chưa có insert cho client** — mở qua RPC kiểm tra giao dịch khi có listings / groups.
- `notifications(user_id, type, title_key, body_key, params jsonb, data jsonb {screen, params}, read_at)` — lưu key i18n, client dịch; client chỉ được sửa `read_at` (column grant). Có trong publication Realtime.
- `bookmarks(user_id default auth.uid(), target_type, target_id)` pk 3 cột.
- `badge_requests(user_id, badge worker|landlord|venue|employer, document_path, status pending|approved|rejected, reject_reason, reviewed_by, reviewed_at)`; tối đa 1 yêu cầu `pending` / huy hiệu / người; staff duyệt → trigger thêm huy hiệu vào `profiles.badges`.
- `blocks(blocker_id default auth.uid(), blocked_id)` pk, không tự chặn; `is_blocked(a, b)` tính cả hai chiều.
- `rate_limits(key, action, window_start, count)` + `assert_rate_limit(key, action, max, window_seconds)` (cửa sổ cố định, lỗi `P0001 rate_limited`, chỉ service role / function definer gọi).
- `audit_log(id identity, actor_id, action <đối_tượng>.<động_từ>, target_type, target_id text, meta)` — staff insert với `actor_id = auth.uid()`, admin đọc, trigger chặn update / delete.
- Hook `custom_access_token_hook` (Postgres function, `pg-functions://`) chép `profiles.role` vào JWT `app_metadata.role` cho middleware web. Quyền thật luôn kiểm bằng `is_staff()` / `is_admin()` đọc `profiles`.

### Listing (migration `20261031110000_listings`, `20261031120000_public_listings`, storage `20261031130000_storage_listing_avatars`)
- enum `listing_category`: `pass_electronics, pass_vehicle, pass_ppe, pass_home, room_rent, room_share, job_main, job_parttime, lost, found`.
- enum `listing_status`: `draft, pending_review, active, sold, closed, expired, rejected`.
- `listings`: `owner_id`, `category`, `status`, `title` (≤120), `slug` (tiêu đề không dấu + id ngắn, sinh bằng trigger, unique), `short_id` (6 ký tự base36, unique), `description`, `price`, `price_type fixed|negotiable|free`, `attributes jsonb` (validate bằng Zod theo category), `site`, `location`, `address_text`, `images text[]`, `lang` (`vi|en|zh`), `view_count`, `expires_at`, `search_vector tsvector generated` (`'simple'`), `deleted_at`.
- Index: `(category, status, created_at desc)`, GIST `location`, GIN `search_vector`, GIN trigram `title`, GIN `attributes`.
- Trigger `trg_listings_identity` sinh `short_id` / `slug` (đổi tiêu đề → slug mới, giữ `short_id`) và `expires_at` mặc định (`listing_default_ttl`); `trg_listings_guard`: chủ tin chỉ đặt `draft | active | sold | closed`, không tự mở lại `pending_review | rejected | expired`, không đổi `owner_id`, `category`, `view_count`, `expires_at`. `search_vector` dùng `f_unaccent` (bỏ dấu, đ → d). Không có quyền delete: xoá mềm `deleted_at`.
- View `public_listings` (anon + authenticated): tin active, chưa xoá, chưa hết hạn, chủ tin không bị cấm / xoá, ẩn hai chiều khi chặn; `lat` / `lng` làm tròn lưới 0.003°, `distance_to_site_m` (làm tròn 100 m), `site_name`, `owner_name` ("An N."), `owner_avatar_url`, `owner_badges`, `owner_rating_*`, `owner_since`. Không SĐT, không `location` chính xác.
- `listing_translations(listing_id, lang, title, description)` pk `(listing_id, lang)` — chỉ service role.
- `listing_views(listing_id, user_id, viewed_on, viewed_at)` pk 1 lượt / người / ngày, ghi qua RPC `record_listing_view` (tăng `view_count`, không đếm chủ tin / khách).
- `search_logs(query ≤100, category, results_count, user_id)` ghi qua RPC `log_search` (anon được), staff đọc.

Hết hạn mặc định (`expires_at`): pass/room 30 ngày, job 14 ngày, lost/found 60 ngày.

### Group
- enum `group_kind`: `ride, sport`; `group_status`: `open, full, in_progress, completed, cancelled`; `member_status`: `requested, accepted, declined, left, kicked`.
- `groups`: `host_id`, `slug`, `short_id`, `kind`, `sub_kind` (ride: `car_owner|bus_pool|motorbike`; sport: `football|badminton|pickleball`), `status`, `title`, `description`, `starts_at`, `ends_at`, `seats_total > 0`, `seats_taken`, `fee_per_person`, `origin`, `origin_text`, `destination`, `destination_text`, `venue_id`, `attributes jsonb`, `requires_approval`, `conversation_id`.
- `group_members(group_id, user_id, status, joined_at)` pk `(group_id, user_id)`.
- Trigger: đổi `group_members` → đếm lại `seats_taken` từ `accepted`; bằng `seats_total` → `full`; giảm → `open`. Insert `groups` → tạo `conversations(kind='group')` + thêm host làm member.

### Chat
- `conversations(kind direct|group, context_type, context_id, last_message_at, last_message_preview)`; direct unique theo `(context_id, cặp user)`.
- `conversation_members(conversation_id, user_id, last_read_at, muted)`.
- `messages(conversation_id, sender_id, body, image_url)` index `(conversation_id, created_at desc)`.
- Trigger insert `messages`: cập nhật `last_message_*`, tạo `notifications` cho member khác (trừ muted, trừ đang bị chặn).

### Moderation
- `reports(reporter_id, target_type listing|group|profile|message, target_id, reason scam|spam|inappropriate|other, detail, status open|reviewing|resolved|dismissed, resolved_by)`.
- `blocks(blocker_id, blocked_id)`.
- `moderation_queue(listing_id, reasons text[] keyword|keyword_reject|new_account|low_price|image_dup|report, risk_score, status pending|approved|rejected, reviewed_by, reviewed_at, note)` — 1 dòng pending / tin; staff đọc / sửa; chỉ trigger / RPC ghi (migration `20261101090000_listing_write_moderation`).
- `banned_keywords(keyword, action reject|review, categories[] | null = mọi category)` — staff đọc, admin ghi; so khớp sau `f_unaccent` theo ranh giới từ.
- Kiểm duyệt tự động là **trigger** `trg_listings_moderate` (không Edge Function): chỉ khi người dùng đăng / sửa tin thành `active` — 10 tin / 24 giờ (`P0001 rate_limited`), từ khoá reject → `rejected`, từ khoá review / tài khoản < 7 ngày / giá < 30% trung vị 30 ngày cùng category (≥ 5 mẫu) → `pending_review`; lý do vào `listings.moderation_reasons` (nội bộ) + `trg_listings_queue` ghi hàng chờ. `review_listing(id, approve, note)` (staff): đổi trạng thái + `audit_log` (`listing.approve` / `listing.reject`) + `notifications` (`listing_approved` / `listing_rejected`, khoá ns `push`). `renew_listing(id)` (chủ, 3 ngày cuối / hết hạn). `reveal_contact(id)` (đăng nhập, 20 / giờ, `audit_log contact.reveal`).
- `notifications.title_key` / `body_key` là khoá trong namespace i18n **`push`** (vd `listing_approved.title`), `params` điền vào placeholder.
- `app_settings(key, value)` — cấu hình nội bộ cho trigger / cron (`web_revalidate_url`, `web_revalidate_secret`), không policy, đọc qua `app_setting(key)` (definer). Local: seed; staging / prod: insert tay (`docs/RUNBOOK.md`).
- Webhook `trg_listings_revalidate`: tin đổi nội dung / trạng thái → `net.http_post(web_revalidate_url, {"tags": ["listing:{id}", "listings"]}, header x-revalidate-secret)`.
- `audit_log(actor_id, action, target_type, target_id, meta jsonb)` — chỉ insert, không update/delete.
- `rate_limits(user_id, action, window_start, count)`.

### Marketing (phục vụ web)
- `marketing_leads(contact, contact_type email|phone, kind user|landlord|venue|employer, site, locale, utm jsonb, consent_at, status new|contacted|closed, note)` — chỉ insert qua Server Action của web (service role, có rate limit theo IP); staff đọc/sửa.
- `banners(placement app_home|web_home|web_listing, title_key, image_path, link_url, locale, starts_at, ends_at, is_active, sort)` — ai cũng đọc banner đang hiệu lực; chỉ admin ghi.

## 5. Row Level Security (bắt buộc trên MỌI bảng)

- Bật RLS ngay trong migration tạo bảng. Bảng không có policy = không ai truy cập (đúng ý cho bảng nội bộ).
- Helper (`security definer`, `search_path = ''`): `is_staff()`, `is_admin()`, `is_banned()` (cấm, khoá tạm hoặc đã xoá), `is_blocked(a, b)`, `is_member(conversation_id)` (khi có chat).
- `listings`: select khi `status='active' and deleted_at is null` (cho cả role **anon** — web render trang tin công khai cho Google) **hoặc** chủ tin **hoặc** staff; ẩn tin của người đã chặn mình. Trang công khai đọc qua view `public_listings` (vị trí làm tròn ~300 m, không có SĐT, tên người đăng chỉ tên + chữ cái họ); bảng gốc chỉ cho chủ tin và staff. Insert: `owner_id = auth.uid()` và `not is_banned`. Update/delete: chủ tin hoặc staff; chủ tin không tự đổi sang `active` nếu đang `pending_review`/`rejected`.
- `messages`, `conversation_members`: chỉ member.
- `groups`: ai đăng nhập cũng xem; chỉ host sửa. `group_members`: user chỉ insert chính mình qua Edge Function; host duyệt qua `respond-join`.
- `profiles`: bảng gốc chỉ chủ + staff; người khác (kể cả anon) đọc qua view `public_profiles` (`id`, `display_name` = `short_name(full_name)` dạng "An N.", `avatar_url, site, badges, rating_avg, rating_count, reputation_score, created_at`). Không expose `phone`, `push_tokens`, `notification_prefs` cho người khác. Số điện thoại người đăng chỉ trả về qua RPC `reveal_contact(listing_id)` có ghi `audit_log` và rate limit.
- Storage policy theo bucket (mục 7).
- Mỗi migration có RLS phải có test pgTAP trong `supabase/tests/` cho 4 vai trò: khách (anon), user, user bị cấm, moderator.

### Phục vụ web Next.js
- Auth: bật provider Phone (OTP) và **Google**; thêm `https://tenapp.vn/**`, `https://*.vercel.app/**` (preview) và URL dev vào Redirect URLs. Web giữ phiên bằng cookie qua `@supabase/ssr`.
- RPC công khai (cho phép anon, `stable`, `security invoker`) — **đã có**: `search_listings`, `get_listing_by_slug`, `similar_listings`, `log_search` (volatile, definer); user: `record_listing_view`. Dự kiến: `get_listing_by_slug(slug)`, `get_group_by_slug(slug)`, `search_listings(...)`, `search_groups(...)`, `similar_listings(id, limit)`, `public_stats()` (số người dùng, tin, chuyến — cache 1 giờ), `sitemap_listings(page)` (id, slug, updated_at của tin active, 10.000/trang).
- Khi tin/nhóm đổi trạng thái hoặc nội dung: DB webhook gọi `revalidate` của web (`POST https://tenapp.vn/api/revalidate` có secret, body `{tag: 'listing:{id}'}`) để trang ISR cập nhật ngay.
- Web không có push: `send-push` bỏ qua người dùng không có `push_tokens`; bảng `notifications` vẫn là nguồn để web hiện chấm đỏ.
- Anon có thể đọc nhiều → index phải phủ mọi truy vấn công khai; giới hạn `p_limit` tối đa 50; không trả cột nhạy cảm qua RPC công khai.

## 6. Edge Functions

Khuôn chung cho mọi function:

```ts
// supabase/functions/<name>/index.ts
import { handler, AppError } from '../_shared/http.ts';
import { JoinGroupInput } from '../_shared/schemas.ts'; // re-export từ packages/shared

export default handler(async ({ req, user, admin }) => {
  const input = JoinGroupInput.parse(await req.json());   // Zod, lỗi → 400 {code:'invalid_input'}
  // logic... dùng `admin` (service role) chỉ khi thật cần, mặc định client theo JWT người gọi
  return { ok: true };
});
```

- Lỗi trả về thống nhất `{ code, message }` với `code` là key i18n (`errors.group_full`); HTTP 400/401/403/404/409/429.
- Xác thực bằng JWT người gọi; function cron/webhook kiểm tra header secret.
- Sentry cho mọi function; log có `request_id`.
- Không gọi function này từ function khác qua HTTP; dùng chung code trong `_shared`.

| Function | Kích hoạt | Việc |
|---|---|---|
| `send-otp` | Auth SMS hook | OTP qua Zalo ZNS, fallback SMS; tối đa 5 OTP/số/giờ |
| `request-badge` | App | Lưu giấy tờ vào bucket `verification`, tạo `badge_requests` cho moderator |
| `join-group` | App | Transaction (`select ... for update`): còn chỗ, chưa tham gia, không bị chặn → insert member (`accepted` nếu `requires_approval=false`) → notification host |
| `respond-join` | App (host) | Duyệt/từ chối, thêm vào chat nhóm, notification người xin |
| `send-push` | DB webhook insert `notifications` | Expo Push theo `push_tokens`, template theo `locale`, gộp tin nhắn 1 phút/người gửi, xoá token hỏng |
| `match-lost-found` | DB webhook insert listings lost/found | Khớp `item_type`, ±2 ngày, < 2 km → notification cả hai |
| `moderate-listing` | DB webhook insert listings | **Chỉ phần cần dịch vụ ngoài**: ảnh trùng hash tin bị từ chối → thêm lý do `image_dup` vào hàng chờ. Luật nội dung (từ khoá, tài khoản mới, giá thấp, 10 tin / ngày) đã ở trigger `trg_listings_moderate` (chạy đồng bộ, tin rủi ro không lộ công khai). 3 báo cáo / 24h → ẩn tạm (trigger, tuần 5) |
| `translate-content` | App | Đọc cache `listing_translations`; chưa có → API dịch → lưu cache |
| `expire-content` | pg_cron mỗi giờ | Tin quá `expires_at` → `expired`; nhóm qua `starts_at` 3h → `completed` + mời đánh giá; nhắc gia hạn trước 3 ngày |
| `remind-groups` | pg_cron 15 phút | Notification trước giờ đi/giờ đá 60 phút |

## 7. Storage

| Bucket | Truy cập | Đường dẫn & giới hạn |
|---|---|---|
| `listing-images` | đọc public, ghi khi `(storage.foldername(name))[1] = auth.uid()::text` | `{user_id}/{listing_id}/{n}.webp`, ≤ 2 MB, chỉ image/webp, image/jpeg |
| `avatars` | đọc public, ghi thư mục của mình | `{user_id}/{timestamp}.webp`, ≤ 1 MB, 512px; `profiles.avatar_url` lưu path (ảnh Google: URL đầy đủ) — client dựng URL bằng `avatarUrl()` |
| `verification` | riêng tư, chỉ chủ upload + staff đọc | xoá tự động 30 ngày sau khi duyệt |
| `chat-images` | riêng tư, signed URL 1 giờ, chỉ member | `{conversation_id}/{message_id}.webp` |

Client lấy thumbnail qua transform `?width=400&quality=75`.

## 8. Realtime

- Publication `supabase_realtime` chỉ gồm: `messages`, `group_members`, `groups`, `notifications`.
- Realtime tôn trọng RLS — test bằng tài khoản không phải member không nhận được event.
- Presence/đang gõ dùng Broadcast, không ghi DB.

## 9. Tìm kiếm

RPC `search_listings(p_category[], p_query, p_lat, p_lng, p_radius_m=10000, p_price_min, p_price_max, p_limit=20, p_cursor timestamptz)`:
- full-text `plainto_tsquery('simple', unaccent(q))` **hoặc** trigram `title % q` (bắt buộc cho tiếng Trung);
- `ST_DWithin` theo bán kính; phân trang **cursor theo `created_at`**, không dùng offset.
- RPC `search_groups(kind, sub_kind, date, p_lat, p_lng, radius, destination_lat, destination_lng)` tương tự, chỉ trả nhóm `open`.
- Ghi `search_logs` để gợi ý từ khoá hot.

## 10. Migration & môi trường

- Local: `supabase start`; đổi schema bằng file migration mới (`supabase migration new <tên>`), **không** sửa trên Studio rồi quên.
- Sau mỗi migration: `supabase gen types typescript --local > packages/db/database.types.ts` và commit cùng nhau.
- Môi trường: local → `dungquat-staging` → `dungquat-prod`. GitHub Actions chạy `supabase db push` + `supabase functions deploy` khi merge `main`.
- Có thể chuyển sang tự host Supabase trên VPS (docker-compose chính thức) mà không đổi code; backup `pg_dump` hàng ngày ra nơi khác, giữ 7 ngày, thử khôi phục mỗi quý.
- Secrets: `supabase secrets set` (ZNS, Goong, Expo access token, API dịch, Sentry DSN). Không có trong git. Service role key chỉ ở Edge Functions và server admin.

## 11. Bảo mật & dữ liệu cá nhân

- Tuân thủ Nghị định 13/2023: lưu đồng ý (consent) khi đăng ký; xoá tài khoản = xoá mềm, xoá cứng sau 30 ngày bằng cron.
- Rate limit qua `rate_limits`: 10 tin/ngày, 50 tin nhắn/giờ cho tài khoản < 7 ngày; 5 OTP/số/giờ.
- Vị trí nhà trọ/nhà riêng trả về cho người khác được làm tròn ~300 m (view hoặc RPC), vị trí chính xác chỉ chủ tin thấy.
- Mọi hành động của moderator/admin ghi `audit_log`; không xoá cứng tin bị vi phạm.

## 12. Trước khi báo "xong"

- [ ] Migration mới chạy sạch từ đầu (`supabase db reset`)
- [ ] RLS bật + test pgTAP cho anon / user / banned / moderator
- [ ] Type đã sinh lại và commit
- [ ] Zod schema dùng chung đã cập nhật trong `packages/shared`; hàm gọi dữ liệu trong `packages/core` đã cập nhật, app và web đều build được
- [ ] Truy vấn công khai cho anon không trả cột nhạy cảm (SĐT, vị trí chính xác, họ tên đầy đủ)
- [ ] Edge Function validate input, trả `{code, message}`, có test gọi thử với JWT thật
- [ ] Không logic trùng giữa trigger và function
- [ ] Không secret trong code; `.env.example` đã cập nhật
- [ ] Cập nhật mục 4 của file này nếu đổi schema
