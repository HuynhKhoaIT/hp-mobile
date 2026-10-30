---
name: shared-package-change
description: Quy trình đổi @hp/core, @hp/shared, @hp/db, @hp/tokens an toàn - cập nhật gói, build, i18n:check, kiểm tra apps/mobile và apps/web còn build, ghi "Thay đổi hợp đồng" vào PLAN. Dùng mỗi khi sửa gì trong packages/.
argument-hint: "<gói> <thay đổi>"
---

# Đổi gói dùng chung

1. Đọc `.claude/rules/be-shared-packages.md`. Phân loại: **thêm** (an toàn) / **đổi kiểu, đổi tên, xoá, đổi key i18n** (phá vỡ).
2. Sửa trong `packages/<gói>`. Phá vỡ → giữ API cũ với `@deprecated` một vòng nếu hai client chưa sửa kịp trong cùng đợt.
3. Trong repo này:
```
pnpm -r build
pnpm i18n:check        # nếu động i18n
pnpm -r test           # nếu có
```
4. Kiểm tra client (hai repo cạnh nhau):
```
pnpm --filter mobile tsc --noEmit
pnpm --filter web tsc --noEmit
pnpm --filter web build
```
   Hai app lấy gói qua pnpm workspace (`workspace:*`) nên lỗi hiện ngay; không cần publish hay bump version.
5. Lỗi ở client thuộc phạm vi được yêu cầu → sửa ở repo đó, commit riêng `chore(core): adapt to @hp/core x.y`. Ngoài phạm vi → liệt kê `file:dòng` trong báo cáo, không sửa lén.
6. `@hp/tokens` đổi màu / spacing / motion → chụp `ui-gallery` (mobile) và `/dev/ui` (web) trước / sau để review; kiểm tra tương phản ≥ 4.5:1.
7. `@hp/db` chỉ sinh lại bằng `supabase gen types`, không sửa tay; commit cùng migration.
8. Ghi `docs/plan/backend.md` mục "Thay đổi hợp đồng": ngày, gói, thay đổi, việc còn lại mobile / web, trạng thái.
