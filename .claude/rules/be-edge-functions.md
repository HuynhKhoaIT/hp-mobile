---
paths:
  - "supabase/functions/**"
---

# Edge Functions (Deno / TypeScript)

## Khi nào viết Edge Function
Chỉ khi: cần secret, nhiều bước trong một transaction, gọi dịch vụ ngoài (ZNS, Expo Push, API dịch, Goong), cron hoặc webhook. CRUD → PostgREST + RLS. Đọc phức tạp → RPC. Ràng buộc / đếm / notification nội bộ → trigger. Một logic ở **một** tầng.

## Khuôn bắt buộc
```ts
// supabase/functions/<name>/index.ts
import { handler, AppError } from '../_shared/http.ts';
import { JoinGroupInput } from '../_shared/schemas.ts';   // re-export từ packages/shared

export default handler({ auth: 'user' }, async ({ req, user, db, admin, log }) => {
  const input = JoinGroupInput.parse(await req.json());   // ZodError → 400 invalid_input (handler lo)
  const { data, error } = await db.rpc('join_group_tx', { p_group_id: input.groupId });  // transaction trong DB
  if (error?.code === 'P0001') throw new AppError(error.message as ErrorCode, 409);
  return { ok: true, data };
});
```
- `handler` (`_shared/http.ts`): CORS, parse JWT → `user` + `db` (client theo JWT, tôn trọng RLS), `admin` (service role; chỉ dùng khi thật cần, kèm comment lý do), `log` có `request_id`, Sentry, map lỗi. `auth`: `'user'` (JWT bắt buộc), `'webhook'` (header `x-webhook-secret`), `'cron'` (header `x-cron-secret`), `'auth-hook'` (Supabase Auth hook secret).
- Lỗi: `throw new AppError('group_full', 409)` → body `{ code: 'errors.group_full', message }`. HTTP: 400 input, 401 chưa đăng nhập, 403 không quyền / bị cấm, 404, 409 xung đột, 429 rate limit. Không trả stack trace. Mã lỗi mới → thêm `errors.<code>` 3 ngôn ngữ trong `packages/shared/i18n`.
- Transaction nhiều bước → một RPC `security definer` (`select ... for update`) gọi từ function, không nhiều query tuần tự từ Deno.
- Không gọi function khác qua HTTP; dùng chung code trong `_shared/` (`push.ts`, `zns.ts`, `rateLimit.ts`, `i18n.ts` template push 3 ngôn ngữ từ ns `push`, `translate.ts`).
- Secrets qua `Deno.env.get('ZNS_API_KEY')`; tên khai báo trong `.env.example` và `supabase/functions/README.md`; không hard-code, không log.
- Rate limit: `assertRateLimit(key, action, max, windowSec)` ghi `rate_limits`; vượt → 429.
- Push (`send-push`): template theo `profiles.locale`; bỏ qua người không có `push_tokens` (web); xoá token `DeviceNotRegistered`; gộp tin nhắn 1 phút / người gửi; payload `data = { screen, params }` đúng map ở `supabase/CLAUDE.md` mục 4 Core.
- Log không chứa SĐT, OTP, token, nội dung tin nhắn.

## Test
- `supabase/functions/<name>/index.test.ts` (Deno test gọi handler với request giả + JWT seed user): happy path + mỗi mã lỗi. Chạy `deno test --allow-all supabase/functions`.
- Local: `supabase functions serve <name> --env-file supabase/.env.local`; gọi thử `curl` với JWT thật từ `seed` user, ghi lệnh + kết quả vào PR.
- Deploy chỉ khi được yêu cầu: `supabase functions deploy <name> --project-ref <ref>`.

## Danh sách và kích hoạt
Bảng `supabase/CLAUDE.md` mục 6 là nguồn sự thật. Thêm function → thêm dòng ở đó + wrapper `packages/core/src/functions.ts` (user-invoked) hoặc trigger `supabase_functions.http_request` / `cron.schedule` trong migration (webhook / cron) + `config.toml` `[functions.<name>] verify_jwt = false` chỉ cho webhook / cron.
