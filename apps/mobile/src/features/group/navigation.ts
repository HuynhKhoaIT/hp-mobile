// Điều hướng của engine Group — một chỗ cho đường dẫn route (groups/[kind], group/[id], group/new/[kind], my-groups,
// venues/new).
// Quay lại / về trang chủ dùng chung backOrHome của engine listing (module dùng chung).
import type { GroupKind } from '@hp/shared';
import { router } from 'expo-router';

export { backOrHome } from '@/features/listing/navigation';

export function openGroup(id: string, opts: { replace?: boolean } = {}) {
  const href = { pathname: '/group/[id]', params: { id } } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

export function openGroupList(kind: GroupKind, opts: { replace?: boolean } = {}) {
  const href = { pathname: '/groups/[kind]', params: { kind } } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

/** Form tạo nhóm (cần đăng nhập — nơi gọi bọc requireAuth, xem useCreateGroupAction). */
export function openCreateGroup(kind: GroupKind, opts: { replace?: boolean } = {}) {
  const href = { pathname: '/group/new/[kind]', params: { kind } } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

/** Nhóm của tôi (tab Tôi, kết quả tạo nhóm) — `tab`: upcoming | past. */
export function openMyGroups(tab?: 'upcoming' | 'past') {
  router.push({ pathname: '/my-groups', params: tab ? { tab } : {} });
}

/** Góp sân mới (từ form tạo kèo) — `sport`: môn đang chọn để chọn sẵn. */
export function openContributeVenue(sport?: string) {
  router.push({ pathname: '/venues/new', params: sport ? { sport } : {} });
}
