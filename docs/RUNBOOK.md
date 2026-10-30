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

Đẩy migration lên staging bằng tay (chỉ khi CI chưa có hoặc cần gấp, ghi lại lý do trong PR):
```
pnpm exec supabase db push --linked --dry-run   # xem trước
pnpm exec supabase db push --linked
```
Prod: chỉ qua GitHub Actions khi gắn tag `v*` (cần approval). Không chạy `db push` lên prod từ máy dev.

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
