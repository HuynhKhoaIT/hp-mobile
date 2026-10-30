---
paths:
  - "apps/web/app/**"
  - "apps/web/middleware.ts"
---

# Route, Server Components, render

## Mặc định server
- `page.tsx`, `layout.tsx` là Server Component. `'use client'` chỉ cho: form, chat, bộ lọc tương tác, bản đồ, animation, upload ảnh — và chỉ ở **component lá** trong `src/features/*/components`, không ở `page.tsx`.
- Đọc dữ liệu trong `page.tsx` qua `features/<x>/queries.ts` (server, gọi `@hp/core` với client từ `@/lib/supabase/server`). Không `fetch` tới API riêng; không import `supabase` trực tiếp trong `app/`.
- Ghi dữ liệu: Server Action trong `features/<x>/actions.ts` (rule `web-server-actions.md`).

## Mỗi segment có
- `loading.tsx` (skeleton đúng hình nội dung) hoặc `<Suspense fallback>` quanh khối dữ liệu.
- `error.tsx` (client) có nút thử lại gọi `reset()`.
- `not-found.tsx` ở `tin/[slug]`, `nhom/[slug]`, `u/[id]`.
- `generateMetadata` cho trang công khai (rule `web-seo-public.md`).

## Cache theo khu
| Khu | Cách | Khai báo |
|---|---|---|
| `(marketing)`, blog, pháp lý | SSG | `export const dynamic = 'force-static'` |
| List `/tro`, `/viec-lam`… không filter | ISR 300s | `export const revalidate = 300`; có `searchParams` → dynamic |
| `tin/[slug]`, `nhom/[slug]` | ISR 300s + tag `listing:{id}` / `group:{id}` | `unstable_cache` với `tags`; webhook từ Supabase gọi `/api/revalidate` |
| `u/[id]` | ISR 600s | `export const revalidate = 600` |
| `(auth)`, `admin` | dynamic, no-store, `noindex` | `export const dynamic = 'force-dynamic'` |

## Locale và URL
- `[locale]` với `localePrefix: 'as-needed'`: vi không tiền tố, `/en/...`, `/zh/...`. `Link` / `redirect` / `useRouter` / `usePathname` lấy từ `@/i18n/navigation` (next-intl), không từ `next/link` hay `next/navigation` trực tiếp.
- Slug: `{tieu-de-khong-dau}-{short_id}`; page lấy `short_id` ở cuối slug, gọi `get_listing_by_slug`; slug trả về khác slug trên URL → `permanentRedirect` 301.
- Đường dẫn tiếng Việt cố định: `/pass-do`, `/tro`, `/viec-lam`, `/that-lac`, `/ghep-xe`, `/ghep-tran`, `/tin`, `/nhom`, `/u`, `/tim-kiem`, `/dang-tin`, `/tao-nhom`, `/tin-nhan`, `/thong-bao`, `/toi`, `/dang-nhap`, `/tai-app`. Không đổi tên route khi chưa hỏi (ảnh hưởng SEO, deep link app, `.well-known`).

## middleware.ts
Thứ tự: next-intl locale → refresh session Supabase (`@supabase/ssr`) → chặn `(auth)` chưa đăng nhập (redirect `/dang-nhap?next=<path>`) → `/admin` (chưa đăng nhập → `/admin/login`; không phải `moderator` / `admin` → 403; chưa `aal2` → `/admin/login/mfa`; header `X-Robots-Tag: noindex, nofollow`). Role đọc từ JWT claims (`app_metadata.role`, Auth Hook `custom-claims` cung cấp) — không query DB trong middleware.

## Khách và đăng nhập
Nút Liên hệ / Đăng tin / Tham gia / Lưu của khách mở `LoginDialog` (client) với `next` + `intent`; sau đăng nhập thực hiện lại đúng hành động. Chỉ redirect cả trang khi vào thẳng route `(auth)`.

## `.well-known`
`app/.well-known/apple-app-site-association/route.ts` và `assetlinks.json/route.ts` trả JSON đúng content-type, giá trị từ env `APP_IOS_TEAM_ID`, `APP_IOS_BUNDLE_ID`, `APP_ANDROID_PACKAGE`, `APP_ANDROID_SHA256`. Path cho app: `/tin/*`, `/nhom/*`. Không cache sai (set `Cache-Control: public, max-age=3600`).
