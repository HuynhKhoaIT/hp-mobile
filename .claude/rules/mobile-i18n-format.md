---
paths:
  - "apps/mobile/app/**"
  - "apps/mobile/src/**"
---

# Đa ngôn ngữ và định dạng

- Mọi chữ hiển thị qua `t('key')` với `useTranslation('<ns>')`. Không chuỗi tiếng Việt/Anh trong JSX, kể cả `placeholder`, `accessibilityLabel`, toast, tiêu đề Header.
- Namespace: `common`, `listing`, `group`, `chat`, `auth`, `errors`. Key `snake_case`, nhóm theo màn/thành phần: `listing.form.price_label`, `group.detail.seats_left`.
- Thêm key → thêm vào **cả 3 file** `packages/shared/i18n/{vi,en,zh}/<ns>.json` trong cùng thay đổi; `pnpm i18n:check` phải pass. Dùng skill `/add-i18n-key`.
- Enum/danh mục: `t('category.pass_vehicle')`, `t('status.active')`, `t('errors.<code>')` với `code` do server trả.
- Số nhiều: `t('key', { count })` với `_one` / `_other`; không ghép chuỗi bằng `+`.
- Tiền / ngày / khoảng cách / thời gian tương đối chỉ qua `@/lib/format` (`formatMoney`, `formatDate`, `formatDistance`, `formatRelative`) — bên trong gọi `@hp/shared/format` với locale hiện tại. Không `toLocaleString()` trong màn hình. Tiền luôn VND.
- Nội dung người dùng giữ ngôn ngữ gốc; `listing.lang !== locale` → hiện nút Dịch (`useTranslateListing` gọi `translate-content`).
- Đổi ngôn ngữ: `setLocale()` trong `@/core/i18n`; chọn ở bước đầu onboarding (mặc định theo `expo-localization`) và trong Cài đặt.
- Khi review màn hình: bật `en` để kiểm tra tràn chữ, `zh` để kiểm tra căn dòng và font.
