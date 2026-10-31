---
paths:
  - "apps/web/app/**"
  - "apps/web/proxy.ts"
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
`next.config.ts` bật `cacheComponents` (Next 16): **không** dùng `export const dynamic`, `revalidate`, `dynamicParams`, `runtime` (build lỗi). Trang mặc định prerender phần tĩnh; cache khai báo bằng `'use cache'` + `cacheLife` + `cacheTag` (`next/cache`) trên hàm đọc trong `features/*/queries.ts`; phần đọc cookie / searchParams đặt trong `<Suspense>`.
| Khu | Cách | Khai báo |
|---|---|---|
| `(marketing)`, blog, pháp lý | tĩnh | không đọc cookie / headers; dữ liệu (nếu có) `'use cache'` + `cacheLife('days')` |
| List `/tro`, `/viec-lam`… không filter | cache 300s | query `'use cache'` + `cacheLife({ revalidate: 300 })`; có `searchParams` → khối kết quả trong `<Suspense>` |
| `tin/[slug]`, `nhom/[slug]` | cache 300s + tag `listing:{id}` / `group:{id}` | query `'use cache'` + `cacheLife({ revalidate: 300 })` + `cacheTag('listing:' + id)`; webhook gọi `/api/revalidate` → `revalidateTag` |
| `u/[id]` | cache 600s | `cacheLife({ revalidate: 600 })` |
| `(auth)`, `admin` | theo request, `noindex` | đọc session qua `cookies()` (tự động là dynamic), nội dung trong `<Suspense>`; không `'use cache'` dữ liệu người dùng |
- Locale lấy bằng `locale()` từ `next/root-params` (layout gốc `app/[locale]/layout.tsx` có `generateStaticParams` 3 ngôn ngữ); không dùng `setRequestLocale` (đã deprecated).

## Locale và URL
- `[locale]` với `localePrefix: 'as-needed'`: vi không tiền tố, `/en/...`, `/zh/...`. `Link` / `redirect` / `useRouter` / `usePathname` lấy từ `@/i18n/navigation` (next-intl), không từ `next/link` hay `next/navigation` trực tiếp.
- Slug: `{tieu-de-khong-dau}-{short_id}`; page lấy `short_id` ở cuối slug, gọi `get_listing_by_slug`; slug trả về khác slug trên URL → `permanentRedirect` 301.
- Đường dẫn tiếng Việt cố định: `/pass-do`, `/tro`, `/viec-lam`, `/that-lac`, `/ghep-xe`, `/ghep-tran`, `/tin`, `/nhom`, `/u`, `/tim-kiem`, `/dang-tin`, `/tao-nhom`, `/tin-nhan`, `/thong-bao`, `/toi`, `/dang-nhap`, `/tai-app`. Không đổi tên route khi chưa hỏi (ảnh hưởng SEO, deep link app, `.well-known`).

## proxy.ts (Next 16 đổi tên từ middleware.ts)
Thứ tự: next-intl locale → refresh session Supabase (`@supabase/ssr`) → chặn `(auth)` chưa đăng nhập (redirect `/dang-nhap?next=<path>`) → `/admin` (chưa đăng nhập → `/admin/login`; không phải `moderator` / `admin` → 403; chưa `aal2` → `/admin/login/mfa`; header `X-Robots-Tag: noindex, nofollow`). Role đọc từ JWT claims (`app_metadata.role`, Auth Hook `custom-claims` cung cấp) — không query DB trong middleware.

## Khách và đăng nhập
Nút Liên hệ / Đăng tin / Tham gia / Lưu của khách mở `LoginDialog` (client) với `next` + `intent`; sau đăng nhập thực hiện lại đúng hành động. Chỉ redirect cả trang khi vào thẳng route `(auth)`.

## `.well-known`
`app/.well-known/apple-app-site-association/route.ts` và `assetlinks.json/route.ts` trả JSON đúng content-type, giá trị từ env `APP_IOS_TEAM_ID`, `APP_IOS_BUNDLE_ID`, `APP_ANDROID_PACKAGE`, `APP_ANDROID_SHA256`. Path cho app: `/tin/*`, `/nhom/*`. Không cache sai (set `Cache-Control: public, max-age=3600`).
