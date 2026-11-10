# Runbook — Người Dung Quất

Thao tác vận hành. Không ghi mật khẩu, khoá hay token vào file này; chúng nằm trong trình quản lý mật khẩu, GitHub Secrets, Vercel và EAS.

## 1. Môi trường Supabase

Organization: **Người Dung Quất** (gói Free).

| Môi trường | Project | Ref | Region | Postgres | Dùng cho |
|---|---|---|---|---|---|
| local | Supabase CLI (Docker) | — | — | 17 | dev trên máy, test pgTAP |
| staging | `dungquat-staging` | `lyyonoszuuljvbnwbvlk` | ap-southeast-1 (Singapore) | 17 | Vercel Preview, EAS kênh `staging`, beta |
| production | `dungquat-prod` | `sqejumuzojqxpcrbnpal` | ap-southeast-1 (Singapore) | 17 | Vercel Production, EAS kênh `production` |

- Dashboard: `https://supabase.com/dashboard/project/<ref>`. API URL: `https://<ref>.supabase.co`.
- Cài đặt khi tạo (cả hai project): Data API bật; **Automatically expose new tables tắt** (migration tự `grant`, xem `.claude/rules/be-migrations.md`); **automatic RLS bật**; không nối GitHub integration của Supabase (deploy qua GitHub Actions).
- Máy dev chỉ `supabase link` với **staging**. Không link máy dev với prod.
- Trước tuần 12: nâng `dungquat-prod` lên Pro (không tạm dừng, PITR 7 ngày).

## 2. Lệnh thường dùng

```
pnpm exec supabase login                     # một lần trên mỗi máy
pnpm exec supabase link --project-ref lyyonoszuuljvbnwbvlk   # staging
pnpm exec supabase projects list             # kiểm tra project đang link (cột linked)

pnpm db:start        # Supabase local (cần Docker Desktop đang chạy)
pnpm db:reset        # chạy lại toàn bộ migration + seed ở local
pnpm db:test         # pgTAP
pnpm db:types        # sinh packages/db/database.types.ts từ local
```

Đẩy migration lên staging: **mặc định qua GitHub Actions** (`.github/workflows/deploy-staging.yml`) — tự chạy khi `main` có migration mới, hoặc Actions → Deploy staging → Run workflow (bỏ chọn dry_run để áp). Cần 2 secret: `STAGING_PROJECT_REF`, `STAGING_DB_PASSWORD`. Workflow nối thẳng session pooler bằng `--db-url`, không `supabase link`: link gọi Management API, token giới hạn quyền bị 403 "does not have the necessary privileges". `SUPABASE_ACCESS_TOKEN` để dành cho deploy Edge Functions sau này.

Mạng công ty chặn giao thức Postgres (cổng 5432 / 6543 mở TCP nhưng treo khi bắt tay; HTTPS vẫn đi) — lệnh `db push` từ máy dev chỉ chạy được qua mạng khác (4G hotspot, mạng nhà). Đẩy bằng tay (chỉ khi cần gấp, ghi lý do trong PR):
```
pnpm exec supabase db push --linked --dry-run   # xem trước
pnpm exec supabase db push --linked
```
Prod: chỉ qua GitHub Actions khi gắn tag `v*` (cần approval). Không chạy `db push` lên prod từ máy dev.

### Đăng nhập thử ở local
OTP cố định `123456` cho các số trong `[auth.sms.test_otp]` (`supabase/config.toml`): `0900000001` … `0900000005` là user seed (bảng dưới), `0900000010` … `0900000019` là tài khoản mới chưa có (mỗi số thử onboarding một lần; `pnpm db:reset` để dùng lại). Số khác không nhận được SMS (báo `sms_failed`). Sửa `config.toml` → `pnpm exec supabase stop` rồi `pnpm db:start` mới có hiệu lực. Email tự động (nếu có) xem tại Mailpit http://127.0.0.1:54324. Studio: http://127.0.0.1:54323.

Trên Windows, container `supabase_vector` (thu log) có thể khởi động lại liên tục — không ảnh hưởng DB / Auth / API.

### User seed (local)
| SĐT | Vai trò | Tên |
|---|---|---|
| 84900000001 | user | Nguyễn Văn An |
| 84900000002 | user | (trống) — tài khoản mới, chưa onboarding: dùng để thử màn onboarding |
| 84900000003 | user **bị cấm** | Lê Văn Cấm |
| 84900000004 | moderator | Phạm Thị Duyệt |
| 84900000005 | admin | Hoàng Văn Quản |

### Đăng nhập SĐT trên staging (chưa có nhà cung cấp SMS)
Tạm thời OTP cố định qua tính năng số test của Supabase — không code riêng, không gửi SMS. Dashboard `dungquat-staging` → Authentication → Sign In / Providers → **Phone**:
1. Bật **Enable Phone provider**; SMS provider chọn Twilio, điền giá trị giả bất kỳ (không bao giờ được gọi với số test; số ngoài danh sách sẽ báo lỗi gửi SMS).
2. **Test Phone Numbers and OTPs**: `84900000001=123456,84900000002=123456,…` — danh sách như `config.toml`; thêm SĐT thật của người thử nếu muốn (dạng `84…`, không dấu +). Danh sách nằm trên Dashboard, không đưa SĐT thật vào git.
3. **Test OTPs Valid Until**: đặt ngày hết hạn (vd hết beta); quá hạn thì số test ngừng hoạt động.
4. Tắt **Confirm phone** nếu đang bật (khớp `enable_confirmations = false` ở local).

Không áp dụng cho prod: prod chỉ mở khi `send-otp` gửi OTP thật.

### Webhook revalidate web (staging / prod)
Trigger `trg_listings_revalidate` gọi web khi tin đổi; chưa cấu hình thì không gửi. Sau khi có domain Vercel, chạy trong SQL Editor của project (secret = `REVALIDATE_SECRET` trên Vercel, không ghi vào git):
```sql
insert into public.app_settings (key, value) values
  ('web_revalidate_url', 'https://<domain>/api/revalidate'),
  ('web_revalidate_secret', '<REVALIDATE_SECRET>')
on conflict (key) do update set value = excluded.value, updated_at = now();
```

### Push notification (staging / prod)
Trigger `trg_notifications_push` gọi Edge Function `send-push` khi có thông báo cho người có push token; chưa cấu hình thì không gửi. Cần (không ghi giá trị vào git):
1. Secret cho function: `supabase secrets set --project-ref <ref> WEBHOOK_SECRET=<chuỗi ngẫu nhiên> EXPO_ACCESS_TOKEN=<expo.dev → Access tokens>`.
2. Deploy: `supabase functions deploy send-push --project-ref <ref>` (`config.toml` đã đặt `verify_jwt = false` cho webhook).
3. SQL Editor của project:
```sql
insert into public.app_settings (key, value) values
  ('functions_url', 'https://<ref>.supabase.co/functions/v1'),
  ('webhook_secret', '<WEBHOOK_SECRET ở bước 1>')
on conflict (key) do update set value = excluded.value, updated_at = now();
```
4. App: `eas init` để có `extra.eas.projectId` (app không lấy được push token khi thiếu) → build dev / staging mới (module native `expo-notifications`).

Local: `supabase/.env.example` → `supabase/.env.local`, `pnpm exec supabase functions serve send-push --env-file supabase/.env.local`; seed đã có `functions_url` / `webhook_secret`. Thử không gọi Expo thật: đặt `EXPO_PUSH_URL` trỏ tới server giả lập.

### Ghép nhóm — Edge Function `join-group`, `respond-join` (staging / prod)
Không cần secret mới (gọi RPC bằng JWT người dùng). Deploy khi được yêu cầu: `supabase functions deploy join-group --project-ref <ref>` và `respond-join` (giữ `verify_jwt` mặc định = true). Thiếu function thì app / web báo lỗi khi bấm "Tham gia" / "Nhận". Local: `pnpm exec supabase functions serve --env-file supabase/.env.local` (phục vụ mọi function; cần container edge-runtime — đừng loại `edge-runtime` khi `supabase start`).

### Huy hiệu, dịch, dọn dữ liệu — Edge Function `request-badge`, `translate-content`, `purge-files` (tuần 10)
- Deploy khi được yêu cầu: `supabase functions deploy request-badge translate-content purge-files --project-ref <ref>` (`purge-files` có `verify_jwt = false` trong `config.toml`).
- Secret: `supabase secrets set CRON_SECRET=<chuỗi ngẫu nhiên> TRANSLATE_API_KEY=<Google Cloud Translation API key>`. Chưa có `TRANSLATE_API_KEY` → nút Dịch báo "Tính năng dịch đang tạm ngưng" (503 `translate_unavailable`), không lỗi gì khác.
- `app_settings` (SQL Editor): `insert into public.app_settings (key, value) values ('cron_secret', '<trùng CRON_SECRET>') on conflict (key) do update set value = excluded.value;` (cùng `functions_url` đã đặt cho send-push). Thiếu → cron `purge-files` không gọi gì.
- Kiểm tra / chạy tay: `curl -X POST <functions_url>/purge-files -H "x-cron-secret: <CRON_SECRET>" -d '{}'` → `{ documents, accounts, files }`. Tài khoản chỉ bị xoá hẳn khi `deleted_at` quá 30 ngày; xoá hẳn là không khôi phục được (ngoài PITR).
- Google Cloud Translation: bật API "Cloud Translation API" trong project, tạo API key giới hạn chỉ API đó; chi phí theo ký tự — rate limit 30 lượt dịch mới / người / giờ, bản dịch được cache trong `listing_translations`.

### Cron nhắc giờ / hết hạn (pg_cron, tuần 8)
Hai job tạo bởi migration `20261103100000_group_lifecycle_chat` (lên cùng `supabase db push`, không cần secret / Edge Function):
- `remind-groups` (`*/15 * * * *`) → `select public.remind_groups()`: `group_reminder` trước giờ diễn ra 60 phút (cửa sổ thực tế 45–60 phút vì chạy 15 phút / lần).
- `expire-content` (`5 * * * *`) → `select public.expire_content()`: nhóm → `in_progress` / `completed` (+ `group_completed`), tin → `expired`, `listing_expiring` trước 3 ngày.

Kiểm tra (SQL Editor): `select jobname, schedule, active from cron.job;` và lần chạy gần nhất `select jobid, status, return_message, start_time from cron.job_run_details order by start_time desc limit 20;`. Chạy tay khi cần: `select public.expire_content();` (trả số dòng mỗi việc). Tạm dừng: `select cron.unschedule('remind-groups');` — bật lại bằng `cron.schedule` như trong migration. Push chỉ đi khi `send-push` + webhook đã cấu hình (mục Push notification).

### Duyệt sân góp (venues) — tạm thời bằng SQL
Màn admin catalog chưa có (tuần 10). Moderator xem sân chờ duyệt và duyệt bằng phiên của chính mình (không dùng service role — trigger ghi `audit_log venue.approve / reject`):
```sql
select id, name, sports, address_text, phone, created_at from public.venues where status = 'pending' order by created_at;
update public.venues set status = 'approved' where id = '<uuid>';
update public.venues set status = 'rejected', reject_reason = 'Trùng sân đã có' where id = '<uuid>';
```
Chạy từ SQL Editor (quyền owner) thì trigger không ghi audit — ghi tay `insert into audit_log (actor_id, action, target_type, target_id) values ('<uuid staff>', 'venue.approve', 'venue', '<id>')`.

### Duyệt tin chờ — màn `/admin/moderation`
Tin của tài khoản < 7 ngày / có từ khoá / giá thấp bất thường / gửi duyệt lại vào `moderation_queue`. Moderator xử lý trên web:
1. Mở `https://<domain>/admin` → đăng nhập bằng SĐT + OTP → **xác thực hai bước** (lần đầu: quét QR bằng Google Authenticator / Microsoft Authenticator / Authy rồi nhập mã 6 số; các lần sau chỉ nhập mã).
2. **Kiểm duyệt tin** (`/admin/moderation`): tab Chờ duyệt (rủi ro cao trước) / Đã duyệt / Đã từ chối, chip lọc theo lý do. Bấm một dòng để xem chi tiết (ảnh, mô tả, thông số, người đăng, lịch sử).
3. **Duyệt** (phím `A`): tin hiện công khai ngay, được gia hạn, chủ tin nhận thông báo. **Từ chối** (phím `R`): bắt buộc chọn lý do mẫu, ghi chú thêm không bắt buộc (chỉ staff thấy). `J` / `K` chuyển tin; sau mỗi thao tác tự sang tin kế. Chọn nhiều dòng → **Duyệt N tin** (xác nhận trước).
4. Mọi thao tác ghi `audit_log` (`listing.approve` / `listing.reject`, `meta.note` = `"<mã lý do>: <ghi chú>"`). Xem nhanh bằng SQL (admin): `select created_at, actor_id, action, target_id, meta from audit_log where action like 'listing.%' order by created_at desc limit 50;`

Dự phòng khi web lỗi: gọi RPC `review_listing(listing_id, true|false, 'ghi chú')` bằng phiên của moderator (không dùng service role — RPC kiểm `is_staff()` theo người gọi).

### Cấp quyền moderator / admin (staging / prod)
1. Người đó đăng nhập app hoặc web ít nhất một lần (để có `auth.users` + `profiles`).
2. **Thêm email cho tài khoản** (bắt buộc cho xác thực hai bước — Supabase dùng email làm tên tài khoản trong mã TOTP; thiếu thì trang MFA báo `errors.mfa_enroll_failed`): Dashboard → Authentication → Users → chọn người dùng → sửa **Email** (đánh dấu đã xác nhận), hoặc SQL Editor:
```sql
update auth.users set email = '<email>', email_confirmed_at = now() where phone = '84xxxxxxxxx';
```
3. Đổi vai trò (SQL Editor chạy quyền owner; người dùng không tự đổi được `role` — trigger guard):
```sql
update public.profiles set role = 'moderator' where phone = '84xxxxxxxxx';   -- hoặc 'admin'
```
4. Người đó **đăng xuất rồi đăng nhập lại** (JWT mới mang `app_metadata.role` qua Auth Hook — cần bật hook, mục dưới) → vào `/admin` → bật xác thực hai bước.
5. Dashboard → Authentication → **Multi-Factor** (Sign In / Providers → MFA): bật **TOTP (App Authenticator)** — enroll + verify. Local đã bật trong `supabase/config.toml` `[auth.mfa.totp]`.
6. Thu quyền: `update public.profiles set role = 'user' where id = '<uuid>';` — có hiệu lực ngay ở mọi trang / action admin (web kiểm vai trò trong `profiles` mỗi request, RLS dùng `is_staff()`), không cần chờ JWT hết hạn.

**Đặt lại xác thực hai bước** (staff mất điện thoại): SQL Editor `delete from auth.mfa_factors where user_id = '<uuid>';` → lần đăng nhập sau trang MFA cho đăng ký lại. Ghi lại ai yêu cầu / ai làm (chưa có màn admin cho việc này).

### Auth hook trên staging / prod
Dashboard → Authentication → Hooks → **Customize Access Token (JWT) Claims** → Postgres function `public.custom_access_token_hook`. Bật sau khi migration `20261030100000_core` đã lên project đó.

## 3. Biến môi trường

| Nơi | Biến | Lấy từ |
|---|---|---|
| `apps/mobile/.env.local`, `apps/web/.env.local` | URL + anon key **local** | output của `pnpm db:start` (`API URL`, `anon key` / `Publishable key`) |
| Vercel Preview | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable), `SUPABASE_SERVICE_ROLE_KEY` (secret) | staging → Project Settings → API Keys |
| Vercel Production | như trên | prod |
| EAS env `preview` / `production` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — **không** secret key | staging / prod |
| GitHub Secrets (tuần 6) | `SUPABASE_ACCESS_TOKEN`, `STAGING_PROJECT_REF`, `STAGING_DB_PASSWORD`, `PROD_PROJECT_REF`, `PROD_DB_PASSWORD` | Account → Access Tokens; mật khẩu DB lúc tạo project |

Đổi / lộ khoá: Project Settings → API Keys → tạo secret key mới → cập nhật Vercel → xoá key cũ. Đổi mật khẩu DB: Project Settings → Database → Reset password → cập nhật GitHub Secrets.

## 4. Việc còn trống (điền khi làm)
- Deploy Edge Functions, đặt `supabase secrets set` (tuần 2+).
- `app.*` settings cho cron / webhook trên staging / prod (tuần 4+, xem `.claude/rules/be-rpc-triggers-cron.md`).
- Backup `pg_dump` hàng ngày và thử khôi phục (tuần 6, 12).
- Thêm moderator / admin.
