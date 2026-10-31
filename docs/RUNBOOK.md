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

### Duyệt tin chờ (chưa có màn /admin/moderation)
Tin của tài khoản < 7 ngày / có từ khoá / giá thấp bất thường vào `moderation_queue`. Moderator đăng nhập rồi gọi RPC `review_listing(listing_id, true|false, 'ghi chú')` (local: Studio → SQL với `set role authenticated` + JWT, hoặc qua `@hp/core` sau khi có màn admin). Danh sách chờ: `select * from moderation_queue where status = 'pending' order by created_at`.

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
