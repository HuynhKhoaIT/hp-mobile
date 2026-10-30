---
paths:
  - "apps/web/src/features/**/actions.ts"
  - "apps/web/src/features/**/queries.ts"
  - "apps/web/src/lib/supabase/**"
  - "apps/web/app/api/**"
---

# Server Actions và queries

## queries.ts (server-only)
```ts
import 'server-only';
import { createServerClient } from '@/lib/supabase/server';
import { listListings } from '@hp/core';
import type { RoomFilters } from '@hp/shared';

export async function getRoomListings(filters: RoomFilters) {
  const supabase = await createServerClient();
  return listListings(supabase, { categories: ['room_rent', 'room_share'], ...filters });
}
```
- Chỉ gọi hàm `@hp/core`; không viết `.from()` tại đây nếu `@hp/core` đã có; thiếu → thêm vào `packages/core` (nhận `SupabaseClient`).
- Trang công khai chạy với client anon (không session vẫn phải trả dữ liệu).
- Dữ liệu ISR bọc `unstable_cache(fn, [key], { tags: ['listing:' + id], revalidate: 300 })`.

## actions.ts
Thứ tự **cố định** trong mỗi action:
```ts
'use server';
import { CreateListingInput } from '@hp/shared';
import { createListing } from '@hp/core';

export async function createListingAction(raw: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = CreateListingInput.safeParse(raw);                 // 1. Zod từ @hp/shared
  if (!parsed.success) return err('invalid_input', parsed.error.flatten().fieldErrors);
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();         // 2. đăng nhập
  if (!user) return err('auth_required');
  const result = await createListing(supabase, parsed.data);       // 3. @hp/core; RLS quyết định quyền
  if (result.error) return err(result.error.code);
  revalidateTag(`listing:${result.data.id}`);                      // 4. revalidate
  revalidatePath('/tin'); revalidatePath('/toi/tin-cua-toi');
  return ok(result.data);
}
```
- Kiểu trả về thống nhất `ActionResult<T> = { ok: true; data: T } | { ok: false; code: string; fieldErrors?: Record<string, string[]> }` (`src/lib/action-result.ts`); `code` là key `errors.*`. Không throw ra client, không trả `null` khi lỗi.
- Không kiểm tra quyền "thay" RLS (không `if (listing.owner_id !== user.id)` để quyết định); RLS chặn, action chỉ map lỗi `42501` → `forbidden`.
- Thao tác nhiều bước → wrapper `@hp/core/functions` (`joinGroup`, `respondJoin`, `requestBadge`, `translateContent`), không tự ghép query.
- Upload: client nén (`browser-image-compression`, cạnh dài 1280, WebP 0.8) rồi upload thẳng Storage; action chỉ nhận `images: string[]` là path.
- Action công khai (lead form, báo cáo của khách): honeypot field + rate limit qua RPC `check_rate_limit(ip_hash, action)` trong `supabase/`.
- Action admin: rule `web-admin.md` (thêm `requireStaff`, quyền theo hành động, `writeAudit`, `notifyUser`).

## lib/supabase
- `server.ts`: `createServerClient()` dùng cookies (`@supabase/ssr`), dùng trong RSC / actions / route handlers.
- `client.ts`: `createBrowserClient()` cho client components (chat Realtime, upload).
- `admin.ts`: service role, `import 'server-only'`, chỉ `features/admin/**` và `/api/revalidate`; env `SUPABASE_SERVICE_ROLE_KEY` không có tiền tố `NEXT_PUBLIC_`.

## app/api
Chỉ webhook / route handler: `/api/revalidate` (POST, header `x-revalidate-secret` so với `REVALIDATE_SECRET`, body `{ tag }` hoặc `{ path }`), `/api/og` nếu cần. Không REST cho client.
