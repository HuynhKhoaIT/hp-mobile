---
paths:
  - "apps/mobile/app/**"
---

# Luật cho file route trong `app/`

Áp dụng cho mọi file trong `app/` (Expo Router). Khung 5 kiểu màn hình: `apps/mobile/CLAUDE.md` mục 6.

## Khung bắt buộc
1. Dòng 1 của file: `// Screen type: List | Detail | Form | Conversation | Hub` (chọn 1). `_layout.tsx` ghi `// Layout`.
2. File route chỉ: import từ `@/ui` và `@/features/*`, gọi hook, ghép JSX, điều hướng. **Không** có:
   - `import` từ `@supabase/*` hay `@/core/supabase`
   - `useQuery` / `useMutation` / `useInfiniteQuery` viết trực tiếp (dùng hook của `@hp/core` hoặc `features/*/hooks.ts`)
   - hàm xử lý dữ liệu dài hơn 10 dòng (đưa vào `features/*`)
   - chuỗi hiển thị thô (dùng `t()`)
3. Bọc bằng `<Screen>`; màn không phải tab có `<Header>`.
4. Đủ 3 nhánh render: `isLoading` → Skeleton đúng hình; rỗng → `EmptyState` có CTA; `isError` → `ErrorState onRetry`. Không `ActivityIndicator` giữa màn.
5. Tối đa 1 hành động chính (nút primary hoặc FAB) mỗi màn.

## Khách chưa đăng nhập
- Màn xem/tìm (List, Detail, Hub, `search`) không yêu cầu đăng nhập.
- Hành động Liên hệ / Đăng / Tham gia / Lưu bọc bằng `requireAuth(() => action())` từ `@/core/auth`; sau đăng nhập quay lại đúng màn và chạy lại hành động. Không tự `router.push('/(auth)/phone')`.

## Route và deep link
| Route | Mở từ |
|---|---|
| `tin/[slug]` → resolve `short_id` → chi tiết tin | Universal/App Link `https://tenapp.vn/tin/{slug}` |
| `nhom/[slug]` → chi tiết nhóm | `https://tenapp.vn/nhom/{slug}` |
| `listing/[id]`, `group/[id]` | điều hướng nội bộ, push |
| `chat/[conversationId]` | push `hoaphat://chat/{id}` |

- Push mở màn qua `data.screen` + `data.params`, xử lý ở `src/core/notifications/routeForNotification.ts`; route không tự parse payload push.
- Nút Chia sẻ luôn dùng URL web qua `shareUrl()` của `@hp/core` (`https://tenapp.vn/tin/{slug}`), không chia sẻ scheme `hoaphat://`.

## Analytics
Gắn qua `track()` từ `@/core/analytics`: Detail tin → `view_listing`; bấm Chat/Gọi → `contact`; submit đăng → `create_listing`; tham gia nhóm → `join_group`. Tên event phải có trong `src/core/analytics/events.ts`; không bịa tên mới tại route.

## Hiệu năng
- Màn có bản đồ hoặc Lottie: `React.lazy` + `Suspense` với Skeleton; bản đồ chỉ mount khi người dùng bật chế độ bản đồ.
- Màn Conversation: subscribe Realtime trong `useEffect`, cleanup unsubscribe khi rời.

## Mẫu tối thiểu (List)
```tsx
// Screen type: List
import { FlashList } from '@shopify/flash-list';
import { Screen, SearchBar, FilterBar, SkeletonListingCard, EmptyState, ErrorState, ListingCard, Fab } from '@/ui';
import { useListingList } from '@/features/listing/hooks';
import { passConfig } from '@/features/pass/config';

export default function PassListScreen() {
  const { t } = useTranslation('listing');
  const q = useListingList(passConfig);
  return (
    <Screen>
      <SearchBar onSubmit={q.setQuery} onFilterPress={q.openFilters} filterCount={q.filterCount} />
      <FilterBar filters={passConfig.filters} value={q.filters} onChange={q.setFilters} />
      {q.isLoading ? <SkeletonListingCard count={6} />
        : q.isError ? <ErrorState onRetry={q.refetch} />
        : q.items.length === 0 ? <EmptyState title={t('list.empty_title')} action={{ label: t('list.post_cta'), onPress: q.goPost }} />
        : <FlashList data={q.items} renderItem={({ item }) => <ListingCard listing={item} layout={passConfig.card.variant} />}
            estimatedItemSize={passConfig.card.estimatedHeight} onEndReached={q.fetchNextPage} onEndReachedThreshold={0.5}
            refreshing={q.isRefetching} onRefresh={q.refetch} />}
      <Fab label={t('list.post_cta')} onPress={() => requireAuth(q.goPost)} />
    </Screen>
  );
}
```
