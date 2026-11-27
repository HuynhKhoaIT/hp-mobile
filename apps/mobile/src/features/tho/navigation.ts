// Điều hướng của mini-app Gọi thợ — một chỗ cho đường dẫn route: tho (tab), request/[id] (chi tiết), request/new (đăng /
// sửa yêu cầu). Quay lại / về trang chủ dùng backOrHome của engine listing (module dùng chung).
import type { ServiceTrade } from '@hp/shared';
import { router } from 'expo-router';

export { backOrHome } from '@/features/listing/navigation';

export type ThoTab = 'index' | 'quotes' | 'chat' | 'mine';

/** Vào mini-app Gọi thợ (ô ở Hub, link web /goi-tho). */
export function openGoiTho(opts: { replace?: boolean } = {}) {
  if (opts.replace) router.replace('/tho');
  else router.push('/tho');
}

/** Một tab của mini-app (về trang chủ mini-app, sau khi đăng yêu cầu…). */
export function openThoTab(tab: ThoTab, opts: { replace?: boolean } = {}) {
  const href = tab === 'index' ? '/tho' : (`/tho/${tab}` as const);
  if (opts.replace) router.replace(href);
  else router.navigate(href);
}

export function openServiceRequest(id: string, opts: { replace?: boolean } = {}) {
  const href = { pathname: '/request/[id]', params: { id } } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

/** Form đăng yêu cầu (cần đăng nhập — nơi gọi bọc requireAuth, xem useNewRequestAction). `trade`: chọn sẵn loại thợ. */
export function openNewRequest(trade?: ServiceTrade, opts: { replace?: boolean } = {}) {
  const href = { pathname: '/request/new', params: trade ? { trade } : {} } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

/** Form sửa yêu cầu (chủ, chưa có báo giá). */
export function openEditRequest(id: string) {
  router.push({ pathname: '/request/new', params: { id } });
}
