---
name: new-screen
description: Tạo màn hình mới trong app/ theo đúng 1 trong 5 mẫu (List, Detail, Form, Conversation, Hub) với đủ loading/empty/error, i18n, analytics, deep link. Dùng khi được yêu cầu "tạo màn hình", "thêm route", "màn danh sách/chi tiết/form".
argument-hint: "<đường dẫn route> <List|Detail|Form|Conversation|Hub> [feature]"
---

# Tạo màn hình mới

Đầu vào: `$ARGUMENTS` = route (vd `app/listing/new/[category].tsx`), kiểu màn, feature (vd `room`).

## Bước 1 — Đọc trước
1. `apps/mobile/CLAUDE.md` mục 6 (khung của kiểu màn) và `.claude/rules/mobile-routes.md`.
2. `src/features/<feature>/config.ts` để biết categories / filters / form fields.
3. Hook có sẵn trong `@hp/core` (`packages/core/src`) — không viết lại.
4. Màn cùng kiểu đã có (vd `app/listing/[id].tsx` cho Detail) → sao chép khung từ đó.

## Bước 2 — Tạo file
- Dòng 1: `// Screen type: <Kiểu>`.
- Khung theo kiểu:

| Kiểu | Thứ tự ghép |
|---|---|
| List | `Screen` → `SearchBar` + `FilterBar` → `FlashList` → `SkeletonListingCard` / `EmptyState` / `ErrorState` → `Fab`; pull-to-refresh; `useInfiniteQuery` theo cursor; `StaggerItem` 8 item đầu |
| Detail | `Screen scroll` → carousel ảnh (`expo-image`, shared element tag `listing-image-{id}`) → tiêu đề / giá / badge → `AttributeList` theo config → `OwnerCard` (Avatar + Rating + huy hiệu) → mô tả + nút Dịch → `SimilarListings` → `StickyCta` (Chat / Gọi / Tham gia) |
| Form | `Screen scroll keyboardAware` → `ImagePicker` → thông tin chính → chi tiết theo category → `LocationPicker` → `StickySubmit`; `useForm` + `zodResolver`; `useDraft`; `SuccessScreen` khi xong |
| Conversation | `Header` có ngữ cảnh tin/nhóm → `FlashList inverted` `MessageBubble` → `Composer` (ảnh + text); `useRealtimeChannel` subscribe / unsubscribe; hướng dẫn an toàn lần đầu |
| Hub | `Screen scroll` → header gradient thu gọn khi cuộn + `SearchBar` dính → lưới `ServiceTile` (icon + chữ) → `BannerCarousel` → section ngang |

- Khách chưa đăng nhập: bọc hành động cần đăng nhập bằng `requireAuth`.
- Analytics: gắn event theo `.claude/rules/mobile-routes.md`.
- Chữ: tạo key i18n mới qua `/add-i18n-key` (3 file).
- Mọi component từ `@/ui`; thiếu → `/new-ui-component`, không tạo tại chỗ.

## Bước 3 — Đăng ký
- Mở từ push hoặc URL web → thêm dòng map trong `src/core/notifications/routeForNotification.ts` và / hoặc alias `tin/[slug]`, `nhom/[slug]`.
- Màn nặng (bản đồ / Lottie) → lazy.
- Cập nhật bảng màn hình trong `docs/plan/mobile.md` mục 4.

## Bước 4 — Tự kiểm
```
pnpm tsc --noEmit && pnpm lint && pnpm i18n:check
```
Kiểm tra: 3 trạng thái, dark, 360px, font 150%, Reduce Motion, `en` / `zh` không tràn. Sau đó chạy `/mobile-done-check`.

## Không làm
- Không import supabase, không viết `useQuery` tại route.
- Không tạo component UI tại chỗ.
- Không sửa file ngoài route + feature liên quan.
