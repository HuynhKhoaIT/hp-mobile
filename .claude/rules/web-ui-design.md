---
paths:
  - "apps/web/src/components/**"
  - "apps/web/src/features/**/components/**"
  - "apps/web/app/**"
  - "apps/web/tailwind.config.*"
---

# Giao diện web

## Token
- Chỉ class Tailwind từ preset `@hp/tokens` (`bg-primary`, `text-muted`, `rounded-md`, `shadow-card`, `bg-service-pass`). Không `bg-[#...]`, không `style={{ color: '#...' }}`, không khai báo màu trong `tailwind.config` ngoài preset.
- Dark mode bằng class `dark` (`next-themes`); component không tự kiểm tra theme.
- Font: `next/font` Be Vietnam Pro (vi / en); Noto Sans SC chỉ load khi `locale === 'zh'`.
- Icon `lucide-react` 20 / 24, `strokeWidth={1.75}`; không trộn bộ icon khác.

## Component
- Primitive: `src/components/ui` (shadcn, sinh bằng CLI, chỉnh token). Không tự viết lại Button / Dialog / Sheet / Select.
- Dùng chung: `src/components/shared` (`logo`, `locale-switcher`, `theme-toggle`, `empty-state`, `error-state`, `skeletons`, `json-ld`, `app-only`, `app-promo-card`, `open-in-app-bar`, `login-dialog`).
- Card / badge của tin và nhóm: `src/features/listing/components/listing-card.tsx`, `src/features/group/components/group-card.tsx` — bố cục, tone badge, thứ tự thông tin **giống app** (`apps/mobile/src/ui/ListingCard.tsx`, `GroupCard.tsx`). Đổi 1 bên → ghi chú để đổi bên kia.
- Tên file `kebab-case.tsx`, export named; component thuộc feature nằm trong `features/<x>/components`.

## Responsive
- Mobile-first. < 640px: bottom nav 5 mục, nút Đăng nổi giữa, 1 cột, drawer `vaul`. ≥ 1024px: header ngang, lưới 3–4 cột, chi tiết tin 2 cột (gallery trái, thông tin + CTA sticky phải), dialog thay drawer.
- Chữ thân ≥ 16px, vùng chạm ≥ 44px, tương phản ≥ 4.5:1, zoom 200% không vỡ.
- Kiểm ở 360px và 1440px.

## Trạng thái
Mỗi khối dữ liệu: loading (Skeleton đúng hình), empty (illustration + CTA), error (thử lại). Không spinner toàn trang.

## Motion (`motion`)
- Vào viewport: fade + y 12–16px, `viewport={{ once: true }}`, stagger 40–60ms. Hover card `-translate-y-0.5`. Tim lưu tin nảy. Skeleton shimmer.
- Landing: mockup điện thoại nổi nhẹ, số liệu đếm tăng (chỉ khi là số thật).
- `useReducedMotion()` → tắt transform, giữ fade ngắn. Khu admin: chỉ transition 150ms.

## Tính năng chỉ có app
`<AppOnly feature="reminders">…</AppOnly>` → web render `AppPromoCard` đúng ngữ cảnh (store badge + QR trên desktop); danh sách feature từ `capabilities.appOnly` của `@hp/core`. `OpenInAppBar` trên trang chi tiết khi UA là điện thoại, đóng được, nhớ 7 ngày (`localStorage` bọc try / catch). **Không** popup chặn, không ép tải app để xem hay dùng tính năng cốt lõi.
