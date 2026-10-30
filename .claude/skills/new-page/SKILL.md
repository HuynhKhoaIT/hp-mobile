---
name: new-page
description: Tạo trang Next.js mới đúng khu vực (marketing, public SEO, auth, admin) với layout/loading/error/metadata/JSON-LD/i18n theo rule. Dùng khi được yêu cầu "tạo trang", "thêm route", "trang danh sách/chi tiết".
argument-hint: "<đường dẫn route> <marketing|public|auth|admin> [feature]"
---

# Tạo trang mới

Đầu vào `$ARGUMENTS`: route (vd `app/[locale]/(app)/tro/page.tsx`), khu vực, feature.

## Bước 1 — Đọc
- `.claude/rules/web-routing-rsc.md`; `public` thêm `web-seo-public.md`; `admin` thêm `web-admin.md`; `marketing` thêm `web-marketing.md`.
- `src/features/<feature>/queries.ts` và hàm `@hp/core` liên quan (`packages/core/src`).
- Trang tương tự đã có → sao chép khung.

## Bước 2 — Tạo file theo khu vực
| Khu | Tạo | Ghi chú |
|---|---|---|
| marketing | `page.tsx` (`force-static`), `generateMetadata`, JSON-LD nếu FAQ / Organization | section là component trong `features/marketing/components` |
| public | `page.tsx` (SSR + `revalidate`), `loading.tsx`, `error.tsx`, `not-found.tsx` nếu `[slug]`, `generateMetadata` đủ hreflang / canonical / OG, `opengraph-image.tsx` cho chi tiết, JSON-LD đúng loại, `generateStaticParams` cho trang khu vực | đọc qua view / RPC công khai; không lộ PII; slug cũ → 301 |
| auth | `page.tsx` `force-dynamic`, `loading.tsx`, `error.tsx`, `robots: noindex`; form / chat là client component lá | middleware đã chặn; `queries.ts` vẫn kiểm tra `user` |
| admin | `page.tsx` `force-dynamic` trong `(dashboard)`, `PageHeader` + `DataTable`, filter / sort / trang qua `searchParams`; action trong `features/admin/<x>/actions.ts` | import chỉ từ `app/[locale]/admin/**` |

- Chữ → `/add-i18n-key`. Dữ liệu → `queries.ts` gọi `@hp/core`. Ghi → `/server-action`.
- Component UI dùng chung → `src/components/shared`; thuộc feature → `features/<x>/components`; primitive → shadcn CLI.
- Khách bấm hành động cần đăng nhập → `LoginDialog` với `intent`.

## Bước 3 — Đăng ký
- public: thêm vào `sitemap.ts` (nếu index), kiểm tra `robots.ts`, thêm link ở header / bottom nav nếu là trang chính.
- admin: thêm mục sidebar (`components/admin/sidebar.tsx`) với `minRole`.
- Cập nhật bảng trang trong `docs/plan/web.md` mục 4.

## Bước 4 — Kiểm
```
pnpm tsc --noEmit && pnpm lint && pnpm i18n:check && pnpm build
```
Xem output `next build`: trang public không chứa chunk admin / chat / Goong. public → `/seo-check`. Cuối cùng `/web-done-check`.
