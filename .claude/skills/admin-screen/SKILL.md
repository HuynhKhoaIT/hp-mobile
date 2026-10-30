---
name: admin-screen
description: Tạo màn hình quản trị trong /admin gồm DataTable, filter trên URL, hành động hàng loạt, ConfirmDialog, server action có audit_log, phân quyền moderator/admin. Dùng khi thêm trang admin mới hoặc thêm hành động kiểm duyệt.
argument-hint: "<tên màn> <bảng dữ liệu> [moderator|admin]"
---

# Màn hình admin

1. Đọc `.claude/rules/web-admin.md` và bảng màn hình `apps/web/CLAUDE.md` mục 10.
2. `src/features/admin/<x>/queries.ts`: đọc bằng client session (policy `is_staff()`); chỉ `admin.ts` khi RLS không cho (kèm comment); phân trang server theo `searchParams` (`page`, `sort`, `q`, `status`), tối đa 50 / trang.
3. `columns.tsx`: id ngắn, đối tượng (link mở trang công khai tab mới), người (tên rút gọn + huy hiệu), trạng thái (`StatusBadge`), thời gian (`formatRelative`), hành động.
4. `app/[locale]/admin/(dashboard)/<x>/page.tsx`: `PageHeader` (tiêu đề, bộ đếm, nút chính) → bộ lọc → `DataTable` (chọn nhiều → thanh hành động hàng loạt) → phân trang. `loading.tsx` + `error.tsx`.
5. `actions.ts`: mỗi hành động 1 action theo khuôn admin (Zod → `requireStaff` → quyền theo hành động → `@hp/core` → `writeAudit` → `notifyUser` → revalidate). Hành động chỉ-admin kiểm tra `role === 'admin'` trong action, không chỉ ẩn nút.
6. `ConfirmDialog` cho mọi hành động ảnh hưởng người dùng; lý do chọn từ `admin.reasons.*` + ô ghi thêm.
7. Hàng chờ: sắp `risk_score desc, created_at asc`; phím tắt `A` / `R` / `J` / `K`; sau hành động tự chuyển mục kế; duyệt hàng loạt.
8. Sidebar: thêm mục với `minRole`. i18n ns `admin` (`vi`, `en`; `zh` fallback).
9. Kiểm: user thường → 403; moderator không thấy nút chỉ-admin và gọi action vẫn bị chặn; `audit_log` có dòng mới đúng `action`; `pnpm build` → trang public không chứa chunk admin. Chạy `/web-done-check`.
