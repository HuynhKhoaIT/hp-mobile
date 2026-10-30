---
name: be-done-check
description: Kiểm tra checklist "trước khi báo xong" của CLAUDE.md mục 12 cho backend - db reset, pgTAP 4 vai trò, type sinh lại khớp, packages build, hai client tsc, RPC công khai không lộ PII, Edge Function validate/lỗi chuẩn, không logic trùng, không secret. Thêm --pentest để thử xuyên RLS/Storage/rate limit/Realtime với từng vai trò.
argument-hint: "[--pentest]"
---

# Kiểm tra backend trước khi "xong"

## 1. Tự động
```
supabase db reset
supabase test db
supabase gen types typescript --local > /tmp/types.ts && diff -q /tmp/types.ts packages/db/database.types.ts   # phải giống
pnpm -r build && pnpm i18n:check
pnpm --filter mobile tsc --noEmit
pnpm --filter web tsc --noEmit
deno test --allow-all supabase/functions          # nếu có test
git grep -nE "(service_role|eyJ[a-zA-Z0-9_-]{30,})" -- supabase packages ':!*.example' ':!*.md'   # phải rỗng
```
Rà `git diff --name-only` (và file mới):
- Migration tạo bảng mà không có `enable row level security` → vi phạm.
- Migration có `create policy` mà không có `supabase/tests/*.test.sql` tương ứng → vi phạm.
- `grant ... to anon` trên bảng gốc (`listings`, `profiles`, `groups`, `messages`) hoặc RPC trả `setof listings|profiles|groups` → vi phạm.
- Function `security definer` thiếu `set search_path` → vi phạm.
- Edge Function không dùng `handler(` từ `_shared/http.ts`, hoặc `await req.json()` không qua `.parse(`, hoặc `console.log` có `phone | otp | token | body` → vi phạm.
- Cùng một `notifications.type` được insert ở cả trigger và Edge Function → vi phạm "một logic một tầng".
- `.env.example` thiếu biến mới; `config.toml` `verify_jwt = false` cho function `auth: 'user'` → vi phạm.
- `packages/core` import `react-native | expo | next` → vi phạm; `packages/shared` import `react | @supabase` → vi phạm.

## 2. Thủ công
- [ ] `supabase/CLAUDE.md` mục 4 / 5 / 6 / 9 đã cập nhật theo thay đổi
- [ ] `docs/plan/backend.md` "Thay đổi hợp đồng" có dòng mới nếu đổi API
- [ ] Edge Function đã gọi thử với JWT thật (ghi lệnh + kết quả)
- [ ] Realtime: tài khoản không phải member không nhận event (nếu đụng chat / group)
- [ ] Seed vẫn chạy; app và web mở được danh sách từ seed

## 3. `--pentest`
Với seed user `user_a`, `user_b`, `banned`, `moderator`, và anon (dùng `supabase/tests/pentest.test.sql` hoặc `curl` PostgREST với JWT từng người), thử lần lượt từng bảng trong `supabase/CLAUDE.md` mục 4:
- `select *` → có cột nhạy cảm (`phone`, `push_tokens`, `location` chính xác, `full_name` đầy đủ) không?
- `update` / `delete` tin, nhóm, hồ sơ của người khác; `insert` với `owner_id` người khác; `update profiles set role = 'admin'`; `update listings set status = 'active'` khi đang `pending_review`.
- Storage: đọc `verification` của người khác; ghi vào folder người khác; ghi đè object; upload 3 MB / mime lạ.
- OTP 6 lần / giờ; `reveal_contact` 21 lần / giờ; 11 tin / ngày; lead 6 / giờ cùng IP.
- Subscribe Realtime `messages` của hội thoại không phải member; `notifications` của người khác.
- Gọi function webhook / cron không có secret; gọi `_tx` RPC trực tiếp bằng anon.
Ghi bảng kết quả (bảng / vai trò / thao tác / kết quả). Bất kỳ "được" nào là lỗi chặn ra mắt.

## 4. Báo cáo
Liệt kê mục chưa đạt kèm `file:dòng`. Bước không chạy được (Docker tắt, không có JWT) ghi rõ "chưa kiểm tra", không đánh dấu đạt.
