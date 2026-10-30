---
name: new-migration
description: Tạo migration Supabase mới theo quy ước (bảng chuẩn, enum, index, RLS bật, trigger updated_at, view công khai), kèm test pgTAP, sinh type, cập nhật Zod/core, mục 4 CLAUDE.md và log hợp đồng. Dùng khi thêm hoặc sửa bảng, cột, enum, index, view, RPC, trigger, cron, webhook.
argument-hint: "<mô_tả_snake_case> [bảng]"
---

# Migration mới

1. **Đọc**: `supabase/CLAUDE.md` mục 4 (schema hiện tại), `.claude/rules/be-migrations.md`, `be-rls.md`, `be-rpc-triggers-cron.md`, và migration gần nhất liên quan (`ls supabase/migrations | tail -5`).
2. **Chọn tầng**: bảng phân tầng `supabase/CLAUDE.md` mục 2. Nếu việc này là Edge Function → `/new-edge-function`; RPC → `/new-rpc`.
3. **Tạo**: `supabase migration new $ARGUMENTS` → mở file, ghi header comment (mục đích, bảng ảnh hưởng, client cần gì).
4. **Viết SQL** theo thứ tự: extension (nếu mới) → enum → bảng (id / created_at / updated_at / deleted_at) → FK → index → `enable row level security` → trigger `set_updated_at` + trigger nghiệp vụ → view công khai nếu bảng có PII hoặc vị trí → policy (`/rls-policy`) → grant cho `anon` chỉ view / RPC công khai → `comment on` cột jsonb trỏ Zod → webhook / cron nếu có.
5. **Chạy**: `supabase db reset` sạch; `supabase test db` pass.
6. **Type**: `supabase gen types typescript --local > packages/db/database.types.ts`.
7. **Hợp đồng**: cập nhật `packages/shared` (Zod / enum / i18n `category.*`, `status.*`, `errors.*`) và `packages/core` (hàm, keys, hooks, type); `pnpm -r build`; `pnpm i18n:check`.
8. **Seed**: cập nhật `supabase/seed.sql` nếu bảng mới cần dữ liệu mẫu; `db reset` lại.
9. **Tài liệu**: sửa `supabase/CLAUDE.md` mục 4 (và 5 / 6 / 9 nếu đụng RLS / function / tìm kiếm); thêm dòng `docs/plan/backend.md` mục "Thay đổi hợp đồng" (ngày, migration, ảnh hưởng mobile / web).
10. **Báo cáo**: tên file migration, bảng / cột / policy / test, việc còn lại ở hai client. Không `db push` lên staging / prod trừ khi được yêu cầu bằng tên môi trường.
