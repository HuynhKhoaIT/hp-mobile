---
paths:
  - "apps/web/app/**"
  - "apps/web/src/**"
  - "apps/web/content/**"
---

# Đa ngôn ngữ (next-intl)

- Mọi chữ qua `useTranslations('<ns>')` (client) hoặc `getTranslations({ locale, namespace })` (server). Không chuỗi thô trong JSX, `alt`, `aria-label`, `title`, metadata, toast.
- File dịch dùng chung `packages/shared/i18n/{vi,en,zh}/<ns>.json` (ns `common`, `listing`, `group`, `chat`, `auth`, `errors`) + namespace riêng web: `web` (marketing, SEO, footer, nav) và `admin` — cũng đủ 3 ngôn ngữ (admin `zh` được fallback `vi`). Thêm key → `/add-i18n-key`; `pnpm i18n:check` phải pass.
- Enum từ DB: `t('category.' + code)`, `t('status.' + code)`; lỗi action: `t('errors.' + code)`.
- Tiền / ngày / khoảng cách / thời gian tương đối: `formatMoney`, `formatDate`, `formatDistance`, `formatRelative` từ `@hp/shared/format` với `locale` hiện tại; không `toLocaleString` tự do. Tiền luôn VND.
- Metadata và JSON-LD: chữ qua `getTranslations` với `locale` của route; `alternates.languages` đủ 3 + `x-default`.
- Blog / pháp lý MDX: `content/<loại>/{vi,en,zh}/<slug>.mdx`; thiếu bản dịch → trang `en` / `zh` hiện bản `vi` kèm thông báo `web.content.not_translated` (không 404).
- Nội dung người dùng giữ nguyên ngôn ngữ; `listing.lang !== locale` → nút Dịch (`translate-content`).
- Review: xem trang ở `en` (dài hơn 30%, không tràn nút) và `zh` (ngắn, kiểm tra căn dòng và font Noto Sans SC).
