---
name: add-i18n-key
description: Thêm key dịch vào cả 3 file vi/en/zh trong packages/shared/i18n (namespace dùng chung hoặc web/admin/push) và chạy i18n:check. Dùng mỗi khi cần chữ hiển thị mới ở app, web hoặc template push.
argument-hint: "<ns.key> \"<tiếng Việt>\" [en] [zh]"
---

# Thêm key i18n

Mọi file dịch nằm một chỗ: `packages/shared/i18n/{vi,en,zh}/<ns>.json`. Một script `pnpm i18n:check` ở gốc kiểm cả app, web và Edge Functions.

1. **Chọn namespace**: dùng chung app + web → `common | listing | group | chat | auth | errors`; chỉ web → `web` (marketing, SEO, nav, footer) hoặc `admin`; template push → `push`. Key `snake_case`, nhóm theo màn / thành phần: `listing.form.price_label`, `web.landing.hero_title`, `admin.moderation.approve`, `push.new_message.title`.
2. **Kiểm tra trùng**: tìm chuỗi tiếng Việt và tên key trong `packages/shared/i18n/vi/`. Có rồi thì dùng lại.
3. **Thêm vào cả 3 file** `vi`, `en`, `zh`, giữ thứ tự alphabet trong nhóm. Chưa có bản en / zh → tự dịch sát nghĩa, ngôn ngữ đời thường ("Pass đồ" → "Sell & buy" / "二手交易"); ghi commit `i18n: needs native review`. Ns `admin` được phép `zh` = bản `vi`.
4. **Placeholder** viết theo i18next `{{count}}`, `{{price}}`; số nhiều `_one` / `_other`. Web next-intl dùng cùng file qua adapter `packages/shared/scripts/i18n-to-next-intl.ts` (đổi `{{x}}` → `{x}`, `_one/_other` → ICU) lúc build; không viết cú pháp ICU thẳng vào JSON. Không HTML trong chuỗi; rich text trên web dùng `t.rich`.
5. Chạy `pnpm i18n:check` → phải pass.
6. **Dùng**: mobile `const { t } = useTranslation('<ns>'); t('<key>')`; web server `const t = await getTranslations({ locale, namespace: '<ns>' })`, client `useTranslations('<ns>')`; Edge Function `tPush(locale, 'push.<type>.title', params)` từ `_shared/i18n.ts`.
7. Commit kèm code dùng key, message `i18n(<ns>): ...`.
