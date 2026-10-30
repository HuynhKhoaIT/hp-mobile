---
paths:
  - "packages/**"
---

# `packages/*` — gói dùng chung app và web

| Gói | Chứa | Cấm |
|---|---|---|
| `@hp/db` | `database.types.ts` sinh tự động; helper type `Tables<'listings'>`, `Enums<'listing_category'>`, `Functions<'search_listings'>` | sửa tay file sinh |
| `@hp/shared` | Zod schemas (`schemas/listing/<category>.ts`, `schemas/group/<kind>.ts`, `schemas/functions/<name>.ts`, `schemas/actions/*.ts`), enums / constants (`APP_NAME`, `EXPIRES_DAYS`, `RATE_LIMITS`, `NOTIFICATION_TYPES`), i18n `i18n/{vi,en,zh}/{common,listing,group,chat,auth,errors,push,web,admin}.json`, `format.ts` (Intl), `slug.ts` | import React, React Native, Expo, Next, Supabase |
| `@hp/core` | hàm gọi Supabase (`listings.ts`, `groups.ts`, `chat.ts`, `profile.ts`, `notifications.ts`, `bookmarks.ts`, `ratings.ts`, `reports.ts`, `functions.ts`), `keys.ts`, hooks TanStack (`hooks/*.ts`), `SupabaseProvider` / `useSupabase`, `capabilities.ts`, `urls.ts` (`shareUrl`, `imageUrl`) | import React Native, Expo, Next; tự tạo client; đọc `process.env` |
| `@hp/tokens` | màu light / dark, `serviceColors`, `space`, `radius`, `font`, `motion`, `shadow`; `tailwind.preset.js` dùng cho cả NativeWind và web | khai báo token ở nơi khác; hex ngoài file này |

## Luật `@hp/core`
- Mọi hàm: `(client: SupabaseClient<Database>, input) => Promise<Result<T>>` với `Result<T> = { data: T; error: null } | { data: null; error: { code: string; message: string } }`; `code` là key `errors.*`. Không throw.
- Hook nhận client qua `useSupabase()` (context do app / web cung cấp qua `SupabaseProvider`); `@hp/core` chỉ phụ thuộc `react`, `@tanstack/react-query`, `@supabase/supabase-js`, `@hp/shared`, `@hp/db`.
- Query key chỉ ở `keys.ts`: `keys.listings(filters)`, `keys.listing(id)`, `keys.myListings()`, `keys.groups(kind, filters)`, `keys.group(id)`, `keys.myGroups()`, `keys.conversations()`, `keys.messages(conversationId)`, `keys.profile(id)`, `keys.notifications()`, `keys.bookmarks()`. Thêm key = thêm ở đây + dùng trong `invalidateQueries` của mutation liên quan.
- Mutation hook có optimistic + rollback cho: gửi tin nhắn, lưu tin, tham gia nhóm, đánh dấu đã bán (TanStack v5: `onMutate` / `onError` / `onSettled`).
- Edge Function gọi qua `functions.ts` (`joinGroup(client, input)`, `respondJoin`, `requestBadge`, `translateContent`); input type từ `@hp/shared`.
- `capabilities.ts`: `appOnly = ['push', 'reminders', 'lostFoundInstantMatch', 'liveLocation', 'offlineDrafts'] as const`. Tính năng app-only mới → thêm ở đây trước khi code ở mobile.
- Đọc công khai dùng view / RPC công khai (`public_listings`, `get_listing_by_slug`, `search_listings`), không `from('listings')` cho khách.
- `urls.ts`: `shareUrl({ type: 'listing' | 'group', slug })` → `https://tenapp.vn/tin/{slug}` / `/nhom/{slug}` (base từ tham số `siteUrl`, không env); `imageUrl(path, 'thumb' | 'full' | 'avatar')`.

## Luật `@hp/shared`
- Zod schema `attributes` theo category là **hợp đồng** với cột `listings.attributes` và với `moderate-listing`; đổi key → migration backfill nếu đã có dữ liệu.
- Input Edge Function và Server Action định nghĩa một lần ở `schemas/functions`, `schemas/actions`; Edge Function re-export, web import.
- i18n: 9 namespace; `pnpm i18n:check` so khoá 3 ngôn ngữ, fail khi thiếu (ns `admin` cho phép `zh` thiếu). Key `snake_case`; placeholder `{{x}}` (i18next) — web next-intl dùng adapter chuyển `{{x}}` → `{x}` lúc build (`scripts/i18n-to-next-intl.ts`).
- `format.ts`: `formatMoney(n, locale)` → `1.500.000 ₫` / `₫1,500,000` / `1,500,000 越南盾`; `formatDistance(m, locale)`; `formatRelative(date, locale)`; `formatDate(date, locale, style)`. Chỉ `Intl`, không `dayjs`.
- `slug.ts`: `toSlug(title) + '-' + short_id` cùng thuật toán với trigger SQL `slugify()` (test so sánh 20 tiêu đề mẫu).

## Phát hành
- Mỗi gói: `package.json` (`name`, `version`, `exports`, `types`, `sideEffects: false`), build `tsc -b`, test `vitest`.
- Đổi API công khai (xoá / đổi tên hàm, đổi kiểu trả về, đổi key i18n) → `docs/plan/backend.md` mục "Thay đổi hợp đồng" kèm việc ở `apps/mobile` và `apps/web`; build cả hai app trước khi coi là xong (`/shared-package-change`).
