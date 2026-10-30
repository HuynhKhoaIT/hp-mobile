---
name: server-action
description: Scaffold một Server Action theo thứ tự Zod → đăng nhập → @hp/core → revalidate, kiểu trả về ActionResult, biến thể admin có kiểm tra role và audit_log. Dùng khi thêm thao tác ghi dữ liệu từ web.
argument-hint: "<tên action> <feature> [admin]"
---

# Server Action

## Bước
1. **Schema input**: tìm trong `@hp/shared` (`packages/shared/src/schemas`). Có → import. Chưa → thêm ở `packages/shared` (cùng PR), không khai báo Zod riêng ở web.
2. **Hàm dữ liệu**: tìm trong `@hp/core`. Chưa → thêm ở `packages/core` (nhận `SupabaseClient`, trả `Result`), export, rồi dùng. Thao tác nhiều bước → wrapper `@hp/core/functions`.
3. **Viết action** trong `src/features/<feature>/actions.ts` theo khuôn `.claude/rules/web-server-actions.md`. Admin → khuôn trong `web-admin.md` (`requireStaff()`, quyền theo hành động, `writeAudit`, `notifyUser`).
4. **Trả `ActionResult`**; `code` là key `errors.*` → thêm key 3 ngôn ngữ nếu mới (`/add-i18n-key`).
5. **Revalidate**: `revalidateTag('listing:{id}')` / `('group:{id}')` + `revalidatePath` danh sách và `/toi/*` liên quan; admin thêm path admin.
6. **Client**: gọi qua `useActionState` / `useTransition`; lỗi field từ `fieldErrors` hiện dưới ô nhập; lỗi chung toast `t('errors.' + code)`; `useOptimistic` cho lưu tin / tham gia nhóm / gửi tin nhắn.
7. **Test tay**: tài khoản khác chủ tin gọi action → nhận `forbidden` từ RLS (không 500); khách → `auth_required`; input sai → `invalid_input` có `fieldErrors`.

## Không
- Không `try { … } catch { return null }` nuốt lỗi; luôn map về `code`.
- Không dùng `admin.ts` ngoài `features/admin`.
- Không nhận file / ảnh trong action; nhận path Storage đã upload từ client.
- Không kiểm tra quyền thay RLS.
