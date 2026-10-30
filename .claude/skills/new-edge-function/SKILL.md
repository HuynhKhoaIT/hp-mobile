---
name: new-edge-function
description: Scaffold một Edge Function Deno theo khuôn handler chung (auth user/webhook/cron, Zod từ packages/shared, lỗi {code,message}, Sentry, rate limit), kèm test, wrapper trong @hp/core, kích hoạt (webhook/cron) và dòng trong bảng CLAUDE.md mục 6. Dùng khi thêm logic cần secret, transaction nhiều bước, dịch vụ ngoài, cron hoặc webhook.
argument-hint: "<tên-function> <user|webhook|cron|auth-hook> [mô tả]"
---

# Edge Function mới

1. **Đúng tầng chưa?** Bảng `supabase/CLAUDE.md` mục 2: CRUD → không viết; đọc phức tạp → `/new-rpc`; ràng buộc / đếm / tạo notification → trigger. Logic đã có ở trigger thì không lặp ở đây.
2. **Input schema**: `packages/shared/src/schemas/functions/<name>.ts` (Zod, export `<Name>Input` + type) + re-export trong `supabase/functions/_shared/schemas.ts`.
3. **Tạo** `supabase/functions/<name>/index.ts` theo khuôn `.claude/rules/be-edge-functions.md`: `handler({ auth })`, `db` theo JWT mặc định; `admin` chỉ khi cần kèm comment lý do; transaction → RPC `_tx` `security definer` (`/new-rpc`).
4. **Lỗi**: mọi nhánh lỗi `throw new AppError('<code>', <http>)`; thêm `errors.<code>` 3 ngôn ngữ (`packages/shared/i18n/*/errors.json`), chạy `pnpm i18n:check`.
5. **Rate limit / secret**: `assertRateLimit(...)` nếu người dùng gọi; secret mới → `.env.example` + `supabase/functions/README.md` + ghi "cần `supabase secrets set <NAME>` trên staging / prod" trong báo cáo.
6. **Kích hoạt**:
   - `user` → wrapper `packages/core/src/functions.ts` (`export async function <name>(client, input): Promise<Result<T>>`), export từ index.
   - `webhook` → trigger `supabase_functions.http_request` / `net.http_post` trong migration (`/new-migration`).
   - `cron` → `cron.schedule` trong migration.
   - `config.toml` `[functions.<name>] verify_jwt = false` chỉ cho webhook / cron / auth-hook.
7. **Test**: `supabase/functions/<name>/index.test.ts` (happy path + mỗi mã lỗi); `deno test --allow-all supabase/functions/<name>`; `supabase functions serve <name> --env-file supabase/.env.local` + `curl` với JWT seed user, ghi lệnh và kết quả.
8. **Tài liệu**: thêm dòng bảng `supabase/CLAUDE.md` mục 6 (function, kích hoạt, việc); `docs/plan/backend.md` "Thay đổi hợp đồng" nếu client cần gọi.
9. Không deploy khi chưa được yêu cầu bằng tên môi trường.
