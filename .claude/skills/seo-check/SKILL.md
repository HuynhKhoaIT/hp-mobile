---
name: seo-check
description: Rà một trang công khai về server render, metadata, hreflang, canonical, OG image, JSON-LD, sitemap/robots, lộ dữ liệu nhạy cảm, bundle và Lighthouse. Dùng trước khi merge trang công khai hoặc khi được hỏi về SEO.
argument-hint: "<đường dẫn trang hoặc URL local>"
---

# Kiểm tra SEO trang công khai

Chạy `pnpm dev` (hoặc `pnpm build && pnpm start`) rồi kiểm từng mục với `$ARGUMENTS`:

1. **Server render**: `curl -s http://localhost:3000<path>` → có `<h1>`, tiêu đề tin, giá trong HTML. Tắt JS trong DevTools vẫn đọc được tin.
2. **Metadata**: HTML có `<title>` đúng mẫu `"{tiêu đề} – {giá} – {khu vực} | {APP_NAME}"`, `<link rel="canonical">`, `<link rel="alternate" hreflang="vi|en|zh|x-default">`, `og:title / og:description / og:image`, `twitter:card`. `(auth)` / admin có `noindex`.
3. **JSON-LD**: `<script type="application/ld+json">` đúng loại theo category; kiểm required fields (`JobPosting.validThrough`, `Offer.priceCurrency = VND`, `Event.startDate`); dán vào validator.schema.org nếu có mạng.
4. **OG image**: mở `<path>/opengraph-image` → ảnh bìa + giá + khu vực, 1200×630.
5. **Sitemap / robots**: `/sitemap.xml` chứa trang (nếu index); `/robots.txt` chặn `/admin`, `/toi`, `/tin-nhan`, `/dang-tin`, `/thong-bao`.
6. **Quyền riêng tư**: HTML không chứa SĐT (`grep -E "(0|\+84)[0-9]{8,9}"`), không họ tên đầy đủ, toạ độ không quá 3 chữ số thập phân, không email.
7. **Bundle**: `pnpm build` → route không có chunk từ `features/admin`, `features/chat`, Goong khi chưa mở bản đồ.
8. **Lighthouse mobile**: `npx lighthouse <url> --preset=mobile --only-categories=performance,seo,accessibility --quiet` → Perf ≥ 90, SEO 100, A11y ≥ 95, LCP < 2.5s, CLS < 0.1.
9. **Trạng thái tin**: tin `sold` / `expired` trả 200 + nhãn + tin tương tự; > 30 ngày → 410.
10. **Locale**: `/en<path>` và `/zh<path>` render đúng, hreflang trỏ chéo nhau.

Báo cáo dạng bảng: mục / đạt–chưa / bằng chứng (lệnh + kết quả). Mục không chạy được ghi "chưa kiểm tra".
