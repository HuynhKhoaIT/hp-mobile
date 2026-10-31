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
| `@hp/tokens` | màu light / dark, `serviceColors`, `space`, `radius`, `font`, `motion`, `shadow`; `tailwind.preset.cjs` (export `@hp/tokens/tailwind.preset`) cho NativeWind 4 và `theme.css` cho web Tailwind v4 — cả hai sinh từ `src/index.ts`, cùng tên class | khai báo token ở nơi khác; hex ngoài file này |

## Luật `@hp/core`
- Mọi hàm: `(client: SupabaseClient<Database>, input) => Promise<Result<T>>` với `Result<T> = { data: T; error: null } | { data: null; error: { code: string; message: string } }`; `code` là key `errors.*`. Không throw.
- Hai entry: `@hp/core` (hàm thuần, **không** import React — dùng được trong Server Component, Server Action, Edge Function) và `@hp/core/react` (`'use client'`: `SupabaseProvider`, `useSupabase`, hook TanStack `useSession`, `useMyProfile`, `useSites`, `useCompleteOnboarding`, `useUpdateProfile`, `unwrap`). Không export thứ gì gọi `createContext` / hook từ entry gốc.
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
- `slug.ts`: `toSlug(title) + '-' + short_id` cùng thuật toán với trigger SQL `slugify()` (bộ ví dụ chung trong `slug.test.ts` và `supabase/tests/000_foundation.test.sql`).

## Phát hành
- Mỗi gói: `package.json` (`name`, `version`, `exports`, `types`, `sideEffects: false`), gói xuất thẳng mã TS (không bước build, trừ `@hp/tokens` sinh `theme.css`); test bằng `node --test` có sẵn trong Node 22 — không thêm vitest khi chưa hỏi.
- Đổi API công khai (xoá / đổi tên hàm, đổi kiểu trả về, đổi key i18n) → `docs/plan/backend.md` mục "Thay đổi hợp đồng" kèm việc ở `apps/mobile` và `apps/web`; build cả hai app trước khi coi là xong (`/shared-package-change`).

## Tên class sinh từ `@hp/tokens` (`packages/tokens/theme.css`)
| Token | Class (web Tailwind v4, app NativeWind) |
|---|---|
| `primary`, `primaryLight`, `accent`, `success`, `warning`, `danger` | `bg-primary`, `bg-primary-light`, `text-accent`, `border-danger`… |
| `bg`, `surface`, `surface2`, `border` | `bg-bg`, `bg-surface`, `bg-surface-2`, `border-border` |
| `text`, `textMuted`, `textDisabled`, `onPrimary` | `text-fg`, `text-muted`, `text-disabled`, `text-on-primary` |
| `serviceColors.{light,dark}.*.fg / .soft` | icon `text-service-pass`, nền ô `bg-service-pass-soft` (… `room`, `job`, `ride`, `sport`, `lost-found`); chữ nhãn luôn `text-fg` |
| `radius.*`, `font.size.*`, `shadow.card` | `rounded-sm/md/lg/xl/full`, `text-xs … text-3xl`, `shadow-card` |
| spacing 4/8/12/16/20/24/32 | `p-1 p-2 p-3 p-4 p-5 p-6 p-8` (thang mặc định Tailwind, khớp token) |
Sửa token → `pnpm --filter @hp/tokens build` để sinh lại `theme.css` và `tailwind.preset.cjs`; CI báo lỗi nếu file chưa sinh lại.
