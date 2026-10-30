---
name: optimistic-mutation
description: Viết mutation có optimistic update và rollback đúng chuẩn TanStack Query v5 cho gửi tin nhắn, lưu tin, tham gia nhóm, đánh dấu đã bán. Dùng khi thêm hoặc sửa mutation cần phản hồi tức thì.
argument-hint: "<tên mutation> <query key bị ảnh hưởng>"
---

# Optimistic mutation

Hook dùng chung đặt ở `@hp/core` (`packages/core/src/hooks/`), phần mobile-only (haptic, toast) bọc lại ở `src/features/*/hooks.ts`.

## Khuôn
```ts
export function useToggleBookmark() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { targetType: 'listing' | 'group'; targetId: string; next: boolean }) => toggleBookmark(client, v),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: keys.listing(v.targetId) });
      const prev = qc.getQueryData(keys.listing(v.targetId));
      qc.setQueryData(keys.listing(v.targetId), (old) => old && { ...old, bookmarked: v.next });
      qc.setQueriesData({ queryKey: keys.listings(), exact: false }, patchInfinite(v.targetId, { bookmarked: v.next }));
      return { prev };
    },
    onError: (_e, v, ctx) => { if (ctx?.prev) qc.setQueryData(keys.listing(v.targetId), ctx.prev); },
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: keys.listing(v.targetId) });
      qc.invalidateQueries({ queryKey: keys.bookmarks() });
    },
  });
}
```

## Checklist
- `cancelQueries` trước khi set; lưu `prev` để rollback.
- Cập nhật mọi cache liên quan (detail + các list chứa item) bằng `setQueriesData` với `exact: false` và helper `patchInfinite`.
- **Gửi tin nhắn**: thêm message tạm `id: 'tmp-' + nanoid()`, `status: 'sending'`; `onSuccess` thay bằng bản thật; `onError` đổi `status: 'failed'` và giữ lại để gửi lại (không xoá); tin chưa gửi persist qua `src/core/offline`.
- **Tham gia nhóm**: `requires_approval=false` → `seats_taken + 1`, thêm avatar mình, status `accepted`; `requires_approval=true` → status `requested`, không tăng chỗ. Rollback cả `keys.group(id)` và `keys.groups(kind)`.
- **Đánh dấu đã bán**: `status: 'sold'` + invalidate `keys.listings()`, `keys.myListings()`; sau đó mở sheet chọn người mua và mời đánh giá.
- **Lưu tin**: như khuôn trên; `BookmarkButton` chạy animation ngay trong `onMutate`.
- Mobile wrapper: haptic Light trong `onMutate`; toast lỗi `t('errors.' + code)` trong `onError`.
- Hook thuộc `@hp/core` → web dùng chung: sau khi sửa, build cả web (`pnpm --filter web tsc --noEmit`).
