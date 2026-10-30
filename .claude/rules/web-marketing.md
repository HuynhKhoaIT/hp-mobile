---
paths:
  - "apps/web/app/*/*marketing*/**"
  - "apps/web/src/features/marketing/**"
  - "apps/web/content/**"
  - "apps/web/public/**"
---

# Marketing và pháp lý

- Thứ tự landing cố định theo `apps/web/CLAUDE.md` mục 9: Hero → 6 dịch vụ → tin mới nhất → 3 bước → an toàn → số liệu → cảm nhận → cho chủ trọ / chủ sân / nhà tuyển dụng → FAQ → CTA → footer.
- "Tin mới nhất" lấy dữ liệu thật, server render. "Số liệu cộng đồng" (RPC `public_stats`) và "Cảm nhận người dùng" **ẩn** khi chưa có dữ liệu thật / chưa xin phép. Không viết lời chứng thực, số liệu, logo đối tác giả.
- Thương hiệu: không logo Hòa Phát; footer luôn có `t('web.footer.disclaimer')` ("Ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát"). Tên app từ `APP_NAME` trong `@hp/shared/constants`, không hard-code.
- Lead form: Server Action → `marketing_leads` (consent bắt buộc, `utm` từ cookie / searchParams, `locale`, `kind`), honeypot + rate limit theo IP; sau submit hiện cảm ơn tại chỗ, không redirect.
- Link store gắn UTM (`utm_source=web&utm_medium=<vị trí>&utm_campaign=<chiến dịch>`); QR trên desktop trỏ `/tai-app?utm_...`. `/tai-app` nhận diện UA: iOS → App Store, Android → Play, desktop → QR + 2 nút.
- Sự kiện PostHog (chỉ sau khi đồng ý cookie, `CookieConsent`): `cta_web_start`, `cta_store_click`, `qr_view`, `lead_submit`, `open_in_app_click`, `app_promo_click`. Tên khai báo ở `src/lib/analytics/events.ts`, trùng tên với app khi cùng ý nghĩa.
- Trang pháp lý (`chinh-sach-bao-mat`, `dieu-khoan`, `xoa-tai-khoan`, `lien-he`, `gioi-thieu`) là MDX 3 ngôn ngữ, bắt buộc trước khi lên store; `xoa-tai-khoan` mô tả đúng luồng xoá mềm 30 ngày → xoá cứng và có nút xoá cho người đã đăng nhập.
- Blog: MDX frontmatter `title, description, date, locale, cover, tags, status`; chỉ `status: published` vào sitemap; `generateMetadata` từ frontmatter.
- Ảnh marketing qua `next/image` tĩnh trong `public/`, có `alt` i18n, WebP / AVIF; Lighthouse mobile Perf ≥ 90.
- Banner (bảng `banners`, placement `web_home` / `web_listing`): đọc banner đang hiệu lực theo `locale`, ISR 300s.
