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
│   └── (expire-content, remind-groups: hàm SQL do pg_cron gọi thẳng — mục 6)
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
- `venues` (migration `20261103090000_venues`) — sân thể thao: `name` 2–120, `sports text[]` (⊂ `football|badminton|pickleball`, bỏ trùng), `site`, `address_text`, `location` (chính xác — địa điểm kinh doanh, không phải PII), `price_ref` VND / giờ, `phone` (số của sân, công khai khi đã duyệt), `status pending|approved|rejected`, `reject_reason`, `created_by` (không lộ ra ngoài), `reviewed_by / reviewed_at`, `deleted_at`. Trigger `trg_venues_guard`: client góp luôn `pending`, 5 sân / 24h (`venue_contribute`), khu mặc định theo hồ sơ; staff đổi trạng thái → `reviewed_*` + `audit_log` (`venue.approve / reject / update / hide`). RPC `search_venues(p_sport, p_site, p_query, p_lat, p_lng, p_limit ≤50)` (anon; approved, gần nhất trước khi có toạ độ).
- `ratings(rater_id, ratee_id, context_type listing|group, context_id, score 1–5, comment ≤500)` unique `(rater_id, context_type, context_id)`; trigger cập nhật `profiles.rating_avg / rating_count`. Client không insert trực tiếp: nhóm qua RPC `rate_group` (tuần 8); tin đăng chưa có.
- `notifications(user_id, type, title_key, body_key, params jsonb, data jsonb {screen, params}, read_at, pushed_at)` — lưu key i18n, client dịch; client chỉ được sửa `read_at` (column grant). Có trong publication Realtime. Trigger `trg_notifications_push` (migration `20261102100000_push_notifications`): người nhận có `push_tokens` + đang bật nhóm đó → `net.http_post(app_setting('functions_url') || '/send-push', header x-webhook-secret = app_setting('webhook_secret'))`; `send-push` ghi `pushed_at`.
- Push token: `profiles.push_tokens` chỉ đổi qua RPC `register_push_token(token)` (Expo token, chuyển chủ khi máy đổi tài khoản, tối đa 5, mới nhất trước) / `unregister_push_token(token)` (trước khi đăng xuất); guard chặn client update thẳng. `profiles.notification_prefs` CHECK `valid_notification_prefs`: `{ messages | listings | groups | lost_found: boolean }`, thiếu = bật, chỉ ảnh hưởng push (`notification_push_enabled(prefs, type)` = `isPushEnabled` ở @hp/shared).
- `bookmarks(user_id default auth.uid(), target_type, target_id)` pk 3 cột.
- `badge_requests(user_id, badge worker|landlord|venue|employer, document_path (null sau khi purge), document_purged_at, status pending|approved|rejected, reject_reason, reviewed_by, reviewed_at)`; tối đa 1 yêu cầu `pending` / huy hiệu / người; tạo qua RPC `request_badge_tx(badge, document_path)` (gọi bởi Edge Function `request-badge`; file phải có trong bucket `verification` đúng thư mục người gọi, chưa có huy hiệu, 3 lần / ngày; lỗi `document_missing, badge_owned, already_requested`); staff duyệt → trigger thêm huy hiệu vào `profiles.badges` + `audit_log badge.approve|reject` + thông báo `system` (`badge_approved|badge_rejected.title/body`).
- Tài khoản (migration `20261104100000_badges_account_admin`): `delete_my_account()` — xoá mềm ngay (`deleted_at`, bỏ push token, huỷ nhóm mình tạo, rời nhóm, audit `account.delete`); Edge Function `purge-files` (cron) xoá cứng sau 30 ngày (file Storage + auth user → FK cascade; `groups.host_id` on delete cascade; `audit_log.actor_id` → null là ngoại lệ duy nhất của trigger chỉ-thêm).
- Quản trị: `admin_stats()` (staff, jsonb số liệu), `staff_set_listing_status(id, active|closed|rejected, note)`, `staff_cancel_group(id, note)` (audit `listing.status`, `group.cancel`), trigger `trg_profiles_audit` (staff đổi vai trò / cấm / khoá tạm / huy hiệu → `user.role|ban|unban|suspend|unsuspend|badges`), `trg_banned_keywords_audit` (`keyword.*`), `export_audit_log(from, to, action_prefix, limit ≤10000)` (admin, ghi `audit.export`).
- `blocks(blocker_id default auth.uid(), blocked_id)` pk, không tự chặn; `is_blocked(a, b)` tính cả hai chiều; client (anon / authenticated) chỉ hỏi được cặp có chính mình — cặp khác trả `false` (không dò được ai chặn ai), staff / server hỏi tự do (migration `20261105090000_pentest_hardening`).
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
- `listing_translations(listing_id, lang, title, description)` pk `(listing_id, lang)` — chỉ service role; Edge Function `translate-content` đọc / ghi; tiêu đề / mô tả đổi → trigger `trg_listings_clear_translations` xoá cache.
- Đồ thất lạc (migration `20261104090000_lost_found_home_feed`): `lost_found_matches(lost_id, found_id, distance_m)` — trigger `trg_listings_match_lost_found` khi tin `lost` / `found` active: cùng `attributes.item_type`, `lost_at` chênh ≤ 2 ngày, cách < 2 km (thiếu toạ độ → cùng khu), bỏ tin `attributes.returned`, chặn nhau, cùng chủ; tối đa 5 cặp mới → `lost_found_match` cho cả hai chủ tin (`body_found|body_lost`, data mở tin kia). Chủ một trong hai tin đọc (`owns_listing`), RPC `list_lost_found_matches(listing_id)`, `mark_listing_returned(listing_id)` (chủ tin: `attributes.returned` + đóng tin, một lệnh).
- RPC `home_feed(p_site, p_limit ≤50)` (anon; definer đọc `listing_views` của chính người gọi): tin active 30 ngày, cùng khu → 3 danh mục hay xem → mới nhất, trừ tin của mình. `search_listings` thêm `p_max_distance_m` (lọc `distance_to_site_m`). Trigger `trg_listings_images_min`: client đăng / chuyển tin trọ sang active với < 3 ảnh → `P0001 images_min` (tin cũ ít ảnh vẫn sửa chữ được).
- `listing_views(listing_id, user_id, viewed_on, viewed_at)` pk 1 lượt / người / ngày, ghi qua RPC `record_listing_view` (tăng `view_count`, không đếm chủ tin / khách).
- `search_logs(query ≤100, category, results_count, user_id)` ghi qua RPC `log_search` (anon được; user 60 / giờ, khách chung 3000 / giờ, vượt → bỏ qua im lặng), staff đọc.

Hết hạn mặc định (`expires_at`): pass/room 30 ngày, job 14 ngày, lost/found 60 ngày.

### Group (migration `20261102110000_groups`)
- enum `group_kind`: `ride, sport`; `group_status`: `open, full, in_progress, completed, cancelled`; `member_status`: `requested, accepted, declined, left, kicked`.
- `groups`: `host_id` (default `auth.uid()`), `slug` / `short_id` (trigger như listings), `kind`, `sub_kind` (ride: `car_owner|bus_pool|motorbike`; sport: `football|badminton|pickleball` — CHECK theo kind), `status`, `title` 5–120, `description` ≤ 2000, `site` (mặc định theo hồ sơ chủ nhóm), `starts_at`, `ends_at`, `seats_total` 1–50 (**chỗ cho người khác, không tính chủ nhóm**; xe máy ≤ 2), `seats_taken` (trigger đếm accepted), `fee_per_person` VND, `origin` / `origin_text` (ride: điểm đi; sport: sân — bắt buộc), `destination` / `destination_text` (bắt buộc với ride), `attributes jsonb` (Zod `GroupAttributes`: ride `luggage_ok`, `stops_ok`, `vehicle_note`; sport `skill_level`, `players_have` — đội đã có sẵn, tính cả chủ nhóm, hiển thị qua `groupLineup`), `requires_approval` (mặc định true), `conversation_id` (chat nhóm), `lang`, `deleted_at`, `venue_id` (sport: sân approved đúng môn — trigger `trg_groups_venue_schedule` báo `invalid_venue`, `origin` lấy theo sân), `reminded_at` (cron đã nhắc; đổi `starts_at` → null).
- `group_members(group_id, user_id, status, note ≤200, joined_at, responded_at, updated_at)` pk `(group_id, user_id)`; chủ nhóm **không** có dòng ở đây. Client chỉ đọc; ghi qua RPC `join_group_tx` / `respond_join_tx` / `leave_group` (definer, khoá dòng nhóm `for update`).
- Trigger: `trg_groups_guard` (client tạo: status open, giờ diễn ra 15 phút – 60 ngày; sửa: không đổi chủ / loại / `seats_taken` / chat / khu, status chỉ → `cancelled`, nhóm đã huỷ / xong / tới giờ không sửa, `seats_total` ≥ `seats_taken` → `seats_below_taken`; mọi vai trò: open ↔ full theo số chỗ), `trg_groups_identity`, `trg_groups_open_chat` (10 nhóm / 24h; tạo `conversations(kind='group', context group)` + chủ nhóm là member), `trg_group_members_sync` (đếm `seats_taken`; accepted → vào chat nhóm, rời → ra; thông báo: requested → chủ nhóm `join_request` body `join_request.body`, accepted ngay → `join_request.body_joined`, rời → `join_request.body_left`; requested → accepted → người xin `join_accepted`; → declined → `join_declined`), `trg_groups_after_update` (huỷ → `group_cancelled` cho accepted + requested), `trg_groups_revalidate` (tag `group:{id}`, `groups`).
- View `public_groups` (anon + authenticated): mọi trạng thái trừ đã xoá, chủ nhóm không bị cấm / xoá, ẩn khi chặn hai chiều; `origin_lat/lng`, `destination_lat/lng` làm tròn 0.003°; `host_name` "An N.", `host_avatar_url`, `host_badges`, `host_rating_*`, `host_since`; `seats_left`; `members` jsonb ≤ 8 accepted `{id, name, avatar_url}`; `is_past`; `venue_id`, `venue_name`, `venue_address` (tuần 8). Không SĐT, không vị trí chính xác, không lời nhắn.
- View `my_groups` (authenticated, invoker): `public_groups` + `my_role host|requested|accepted`, `is_upcoming` (open / full / in_progress), `my_rating`.
- Vòng đời (migration `20261103100000_group_lifecycle_chat`, pg_cron): `remind_groups()` mỗi 15 phút — nhóm open / full bắt đầu trong 60 phút, chưa nhắc → `group_reminder` cho chủ nhóm + accepted (`body_ride|body_sport`, params `title`, `time` giờ VN); `expire_content()` phút 5 mỗi giờ — tới giờ → `in_progress`, qua `ends_at` (hoặc `starts_at` + 3h) → `completed` + `group_completed` (mời accepted chấm chủ nhóm), tin quá hạn → `expired`, tin còn ≤ 3 ngày → `listing_expiring` (một lần mỗi mốc `expires_at`).
- `rate_group(group_id, score, comment)` (definer): accepted chấm chủ nhóm sau giờ diễn ra, một lần / nhóm; lỗi `group_not_finished, already_rated, forbidden, invalid_input, message_has_phone, message_profanity`.
- RPC: `search_groups(p_kind, p_sub_kinds, p_site, p_query, p_from, p_to, p_lat, p_lng, p_radius_m, p_dest_lat, p_dest_lng, p_dest_radius_m, p_include_full, p_limit ≤50, p_cursor_starts_at, p_cursor_id)` (anon; nhóm open — thêm full khi `p_include_full` — chưa tới giờ, sớm nhất trước, cursor `(starts_at, id)`), `get_group_by_slug(slug)` (anon), `list_group_members(group_id)` (invoker: chủ nhóm thấy mọi trạng thái + lời nhắn, accepted thấy nhau, người xin thấy dòng mình), `join_group_tx(group_id, note)` → `requested | accepted`, `respond_join_tx(group_id, user_id, accept)` → `accepted | declined`, `leave_group(group_id)`. Lỗi `P0001`: `auth_required, banned, not_found, cannot_join_own, blocked, group_closed, group_full, already_joined, join_declined, host_cannot_leave, forbidden, rate_limited, message_has_phone, message_profanity, starts_too_soon, starts_too_far, seats_below_taken`.
- Helper: `is_group_host(id)`, `is_group_member(id)` (accepted).
- Chat nhóm (tuần 8): `list_conversations` trả cả hội thoại nhóm (vào hộp thư khi đã có tin; trước đó mở từ nút "Chat nhóm" — `p_conversation_id` vẫn trả dòng) + `group_title, group_slug, group_kind, group_sub_kind, group_status, group_starts_at, group_host_id, member_count, last_sender_name`; `list_conversation_members(conversation_id)` (tên "An N." + avatar); `new_message` của chat nhóm dùng khoá `new_message.group_title / group_body / group_image`.

### Chat (migration `20261102090000_chat`)
- `conversations(kind direct|group, context_type listing|group, context_id, user_low, user_high, created_by, last_message_at, last_message_preview ≤140, last_sender_id)`; direct unique theo `(context, cặp user sắp xếp)`. Client không insert: mở qua RPC `start_listing_conversation(listing_id)` (definer: tin còn hiện, không tự chat, không bị chặn; trả id cũ nếu đã có).
- `conversation_members(conversation_id, user_id, last_read_at, muted)` — member đọc; chỉ sửa dòng mình, cột `last_read_at` / `muted`.
- `messages(id client sinh, conversation_id, sender_id, body ≤2000, image_path)` index `(conversation_id, created_at desc)`; không sửa / xoá từ client. Ảnh: bucket `chat-images` path `{conversation_id}/{message_id}.webp`.
- Trigger trước insert: giờ server, cắt khoảng trắng, ảnh đúng path, **lọc nội dung** (`chat_message_violation`: SĐT → `P0001 message_has_phone`, từ cấm → `message_profanity`), 50 tin / giờ cho tài khoản < 7 ngày. Sau insert: `last_message_*`, người gửi coi như đã đọc, `notifications` `new_message` (khoá ns `push`: `new_message.title|body|image`, params `sender_name`, `preview`, `title`) cho member khác (trừ muted, chặn, đã xoá).
- `chat_banned_words(word, match_mode exact|unaccent)` — staff đọc, admin ghi. `has_phone_number(text)` cùng thuật toán `hasPhoneNumber` (@hp/shared).
- RPC: `list_conversations(p_limit, p_cursor, p_conversation_id)` (invoker; người kia qua `public_profiles`, tin qua `public_listings`, `unread_count` ≤ 99, cờ chặn hai chiều), `count_unread_conversations()`, `mark_conversation_read(id)` (đồng thời đánh dấu đọc notification `new_message` của hội thoại).
- Helper: `is_member(id)`, `can_send_message(id)`, `is_member_path(text)` (Storage / Realtime topic).

### Moderation
- `reports(reporter_id, target_type listing|group|profile|message, target_id, reason scam|spam|inappropriate|other, detail ≤500, status open|reviewing|resolved|dismissed, resolved_by, resolved_at)` — 1 báo cáo đang mở / người / đối tượng (trùng → 23505), 3 / giờ, không tự báo cáo mình; người báo đọc của mình, staff đọc / sửa (trigger ghi `audit_log report.update`). **Tin bị ≥ 3 người báo cáo / 24 giờ → `pending_review` + hàng chờ lý do `report`** (trigger `trg_reports_auto_hide`).
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
- `banners(placement app_home|web_home|web_listing, locale | null, title, subtitle, cta_label, link_url (/… hoặc https://), image_path (bucket `banners`), tone primary|accent|<dịch vụ>, starts_at, ends_at, is_active, sort)` — migration `20261101110000_home_banners_stats`; chữ viết sẵn theo locale (không khoá i18n: admin đổi theo đợt không cần deploy); ai cũng đọc banner đang hiệu lực, admin thấy / ghi tất cả, mọi thay đổi ghi `audit_log` (`banner.insert|update|delete`). Bucket `banners` public, chỉ admin ghi.
- RPC `my_listing_stats()` (authenticated, invoker): `active, pending, rejected, drafts, expiring_soon, total_views` của chính người gọi — thẻ "Tin của bạn" ở Hub (`docs/design/home.md`).

## 5. Row Level Security (bắt buộc trên MỌI bảng)

- Bật RLS ngay trong migration tạo bảng. Bảng không có policy = không ai truy cập (đúng ý cho bảng nội bộ).
- Helper (`security definer`, `search_path = ''`): `is_staff()`, `is_admin()`, `is_banned()` (cấm, khoá tạm hoặc đã xoá), `is_blocked(a, b)`, `is_member(conversation_id)` (khi có chat).
- `listings`: select khi `status='active' and deleted_at is null` (cho cả role **anon** — web render trang tin công khai cho Google) **hoặc** chủ tin **hoặc** staff; ẩn tin của người đã chặn mình. Trang công khai đọc qua view `public_listings` (vị trí làm tròn ~300 m, không có SĐT, tên người đăng chỉ tên + chữ cái họ); bảng gốc chỉ cho chủ tin và staff. Insert: `owner_id = auth.uid()` và `not is_banned`. Update/delete: chủ tin hoặc staff; chủ tin không tự đổi sang `active` nếu đang `pending_review`/`rejected`.
- `messages`, `conversation_members`, `conversations`: chỉ member (kể cả staff — staff xem nội dung báo cáo qua server admin). Gửi tin: `can_send_message` (member, không bị cấm, không chặn hai chiều).
- `groups`: bảng gốc chỉ chủ nhóm + staff đọc (có vị trí chính xác); mọi người (kể cả anon) đọc qua view `public_groups` / RPC công khai. Insert: `host_id = auth.uid()` và không bị cấm; update: chủ nhóm (guard trigger giới hạn cột / trạng thái). `group_members`: đọc dòng mình, chủ nhóm đọc cả nhóm, accepted đọc accepted cùng nhóm, staff đọc hết; không ai ghi trực tiếp — chỉ RPC `join_group_tx` (qua `join-group`), `respond_join_tx` (qua `respond-join`), `leave_group`.
- `venues`: anon + user đọc `approved` (chưa xoá); người góp đọc sân mình góp; staff đọc / sửa / duyệt hết (audit). Insert: `created_by = auth.uid()` và không bị cấm, luôn `pending`. `my_groups`: chỉ nhóm của người gọi.
- `ratings`: đọc khi đăng nhập; ghi qua RPC `rate_group`.
- `profiles`: bảng gốc chỉ chủ + staff; người khác (kể cả anon) đọc qua view `public_profiles` (`id`, `display_name` = `short_name(full_name)` dạng "An N.", `avatar_url, site, badges, rating_avg, rating_count, reputation_score, created_at`). Không expose `phone`, `push_tokens`, `notification_prefs` cho người khác. Số điện thoại người đăng chỉ trả về qua RPC `reveal_contact(listing_id)` có ghi `audit_log` và rate limit.
- Storage policy theo bucket (mục 7).
- Mỗi migration có RLS phải có test pgTAP trong `supabase/tests/` cho 4 vai trò: khách (anon), user, user bị cấm, moderator.

### Phục vụ web Next.js
- Auth: bật provider Phone (OTP) và **Google**; thêm `https://tenapp.vn/**`, `https://*.vercel.app/**` (preview) và URL dev vào Redirect URLs. Web giữ phiên bằng cookie qua `@supabase/ssr`.
- RPC công khai (cho phép anon, `stable`, `security invoker`) — **đã có**: `search_listings`, `get_listing_by_slug`, `similar_listings`, `log_search` (volatile, definer), `search_groups`, `get_group_by_slug` (tuần 7), `search_venues` (tuần 8), `home_feed` (tuần 9); user: `record_listing_view`. Dự kiến: `get_listing_by_slug(slug)`, `get_group_by_slug(slug)`, `search_listings(...)`, `search_groups(...)`, `similar_listings(id, limit)`, `public_stats()` (số người dùng, tin, chuyến — cache 1 giờ), `sitemap_listings(page)` (id, slug, updated_at của tin active, 10.000/trang).
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
| `request-badge` | App / web (auth `user`) — **đã có** (tuần 10) | Client upload giấy tờ vào `verification/{uid}/{badge}/{ts}.{webp|jpg|pdf}` (policy thư mục mình) rồi gọi function → RPC `request_badge_tx` bằng JWT người gọi → `{ id }`. Logic thuần + test: `_shared/week10.ts`, `_shared/week10.test.ts` |
| `purge-files` | pg_cron 20:30 UTC (`call_purge_files()` → `app_settings.functions_url` + header `x-cron-secret` = `cron_secret`; auth `cron`) — **đã có** (tuần 10) | Giấy tờ đã duyệt / từ chối quá 30 ngày → xoá file, `document_path` null; tài khoản xoá mềm quá 30 ngày (50 / lần) → xoá file avatars / listing-images / verification + `auth.admin.deleteUser` (cascade). Secret `CRON_SECRET` |
| `join-group` | App (auth `user`) — **đã có** (tuần 7) | Gọi RPC `join_group_tx` bằng JWT người gọi (khoá dòng nhóm: còn chỗ, chưa tham gia, không chặn, lời nhắn không SĐT / từ cấm, 20 lần / giờ) → `{ status: requested | accepted }`; thông báo chủ nhóm do trigger. Input `{ groupId, note? }` (`_shared/groups.ts`), test `_shared/groups.test.ts` |
| `respond-join` | App (chủ nhóm, auth `user`) — **đã có** (tuần 7) | Gọi RPC `respond_join_tx` → `{ status: accepted | declined }`; trigger thêm vào chat nhóm + thông báo người xin. Input `{ groupId, userId, accept }` |
| `send-push` | DB webhook insert `notifications` (`trg_notifications_push`, auth `webhook`) — **đã có** (tuần 6) | Expo Push theo `push_tokens`, template ns `push` theo `locale` (`_shared/i18n.ts`), bỏ qua đã tắt nhóm / không token, gộp tin nhắn cùng hội thoại 1 phút (`pushed_at`), xoá token `DeviceNotRegistered`. Secrets: `WEBHOOK_SECRET`, `EXPO_ACCESS_TOKEN` (`supabase/.env.example`). Logic thuần + test: `_shared/push.ts`, `_shared/push.test.ts` |
| `match-lost-found` | **trigger `trg_listings_match_lost_found` trong DB, không phải Edge Function** (tuần 9) | Khớp `item_type`, ±2 ngày, < 2 km → notification cả hai (mục 4 Listing) |
| `moderate-listing` | DB webhook insert listings | **Chỉ phần cần dịch vụ ngoài**: ảnh trùng hash tin bị từ chối → thêm lý do `image_dup` vào hàng chờ. Luật nội dung (từ khoá, tài khoản mới, giá thấp, 10 tin / ngày) đã ở trigger `trg_listings_moderate` (chạy đồng bộ, tin rủi ro không lộ công khai). 3 báo cáo / 24h → ẩn tạm (trigger, tuần 5) |
| `translate-content` | App / web (auth `user`) — **đã có** (tuần 10) | Đọc tin qua `public_listings` bằng JWT; cùng ngôn ngữ → bản gốc; cache `listing_translations`; chưa có → Google Cloud Translation v2 (`TRANSLATE_API_KEY`; trống → 503 `translate_unavailable`), 30 lượt dịch mới / người / giờ, lưu cache → `{ title, description, lang, source }` |
| `expire-content` | pg_cron phút 5 mỗi giờ — **hàm SQL `expire_content()`, không phải Edge Function** (tuần 8) | Tin quá `expires_at` → `expired`; nhóm tới giờ → `in_progress`, qua `ends_at` / `starts_at` + 3h → `completed` + `group_completed` (mời đánh giá); `listing_expiring` trước 3 ngày. Chỉ đổi dữ liệu + tạo notifications (push qua `send-push` sẵn có) nên không cần secret / dịch vụ ngoài |
| `remind-groups` | pg_cron 15 phút — **hàm SQL `remind_groups()`** (tuần 8) | `group_reminder` trước giờ đi / giờ đá 60 phút cho chủ nhóm + thành viên, một lần / nhóm (`groups.reminded_at`) |

## 7. Storage

| Bucket | Truy cập | Đường dẫn & giới hạn |
|---|---|---|
| `listing-images` | đọc public, ghi khi `(storage.foldername(name))[1] = auth.uid()::text` | `{user_id}/{listing_id}/{n}.webp`, ≤ 2 MB, chỉ image/webp, image/jpeg |
| `avatars` | đọc public, ghi thư mục của mình | `{user_id}/{timestamp}.webp`, ≤ 1 MB, 512px; `profiles.avatar_url` lưu path (ảnh Google: URL đầy đủ) — client dựng URL bằng `avatarUrl()` |
| `verification` | riêng tư 5 MB (webp / jpeg / pdf); chủ upload vào `{uid}/…` (không bị cấm), chủ + staff đọc; không ghi đè / xoá từ client | `{user_id}/{badge}/{timestamp}.{ext}`; `purge-files` xoá 30 ngày sau khi duyệt |
| `chat-images` | riêng tư, signed URL 1 giờ, chỉ member | `{conversation_id}/{message_id}.webp` |

Client lấy thumbnail qua transform `?width=400&quality=75`.

## 8. Realtime

- Publication `supabase_realtime` chỉ gồm: `messages`, `group_members`, `groups`, `notifications`.
- Realtime tôn trọng RLS — test bằng tài khoản không phải member không nhận được event.
- Presence/đang gõ dùng Broadcast **kênh riêng tư** `conversation:{id}` (`private: true`); policy trên `realtime.messages` chỉ cho member nghe / gửi. Không ghi DB.

## 9. Tìm kiếm

RPC `search_listings(p_category[], p_query, p_lat, p_lng, p_radius_m=10000, p_price_min, p_price_max, p_limit=20, p_cursor timestamptz)`:
- full-text `plainto_tsquery('simple', unaccent(q))` **hoặc** trigram `title % q` (bắt buộc cho tiếng Trung);
- `ST_DWithin` theo bán kính; phân trang **cursor theo `created_at`**, không dùng offset.
- RPC `search_groups(...)` (mục 4 Group): nhóm `open` (tuỳ chọn thêm `full`) chưa tới giờ, khung giờ `p_from` / `p_to`, bán kính điểm đi / đến, tìm không dấu trên tiêu đề + điểm đi / đến; cursor `(starts_at, id)`.
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
