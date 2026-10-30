---
paths:
  - "apps/web/app/**"
  - "apps/web/src/features/**/queries.ts"
  - "apps/web/src/components/shared/**"
---

# SEO và quyền riêng tư trên trang công khai

Áp dụng cho trang trong `(app)` không thuộc `(auth)` và trang `(marketing)`.

## Metadata (mọi trang công khai)
- `generateMetadata`: `title`, `description`, `alternates.canonical`, `alternates.languages` (vi / en / zh + `x-default`), `openGraph` (image từ `opengraph-image.tsx`), `robots` (index cho công khai; `noindex` cho `(auth)`, admin, trang filter sâu > 2 tham số).
- Title tin: `"{tiêu đề} – {giá} – {khu vực} | {APP_NAME}"`. List có filter khu vực: H1 "Phòng trọ gần KCN Dung Quất".
- JSON-LD qua `<JsonLd data={...} />` (`src/components/shared/json-ld.tsx`): pass đồ `Product` + `Offer` (`priceCurrency: 'VND'`); việc `JobPosting` (`validThrough = expires_at`); trọ `Accommodation`; ghép trận `Event`; FAQ `FAQPage`; landing `Organization` + `MobileApplication`. Không JSON-LD cho dữ liệu không có thật.
- Trang khu vực tĩnh `/tro/[site]`, `/viec-lam/[site]`…: `generateStaticParams` từ bảng `sites`.

## Sitemap và robots
- `sitemap.ts` là sitemap index: tĩnh + khu vực + tin `active` qua RPC `sitemap_listings(page)` (10.000 / file). Không có `/admin`, `(auth)`, `/u/[id]`.
- `robots.ts` disallow `/admin`, `/toi`, `/tin-nhan`, `/dang-tin`, `/thong-bao`, `/tao-nhom`.
- Tin `sold` / `expired` / `closed`: trả 200 với nhãn + tin tương tự trong 30 ngày; sau đó trả 410 (route handler set status, không `notFound()` 404).

## Dữ liệu công khai — không được lộ
Chỉ đọc qua view / RPC công khai trong `supabase/` (`public_listings`, `public_profiles`, `public_groups`, `get_listing_by_slug`, `search_listings`…). Trang công khai **không** hiển thị:
- số điện thoại (chỉ sau đăng nhập, qua RPC `reveal_contact`, nút "Hiện số"),
- vị trí chính xác nhà trọ / nhà riêng (bản đồ vẽ vòng tròn quanh toạ độ đã làm tròn ~300 m từ view, không marker chính xác),
- họ tên đầy đủ (view đã rút gọn "Nguyễn V."), email, ảnh giấy tờ.
Nếu một query trả thêm cột nhạy cảm, lỗi nằm ở `supabase/`: báo lại, không `select` chọn cột để che.

## Hiệu năng
- HTML server render phải có nội dung tin (tắt JS vẫn đọc được).
- `next/image` với loader Supabase transform (`?width=`), `sizes` đúng, ảnh bìa `priority`; `fill` + aspect cố định để CLS < 0.1.
- Không bundle admin / chat / bản đồ vào trang công khai (kiểm tra output `next build`; Goong JS qua `dynamic(() => import(...), { ssr: false })` chỉ khi bật chế độ bản đồ).
- Mục tiêu Lighthouse mobile: Perf ≥ 90, SEO 100, A11y ≥ 95; LCP < 2.5s, CLS < 0.1 (cả trang chi tiết tin). Chạy `/seo-check` trước khi merge.
