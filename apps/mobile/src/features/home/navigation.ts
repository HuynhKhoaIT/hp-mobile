// Điều hướng từ Hub: ô dịch vụ, chip "Tìm nhanh", link banner, chuông thông báo. Đường dẫn route của tin đăng lấy
// từ engine listing (LISTING_ROUTE_SLUG); link web nội bộ map qua routeForWebPath (src/lib/urls.ts).
import type { HomeShortcut, HomeTile } from '@hp/shared';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { requireAuth } from '@/core/auth';
import { LISTING_ROUTE_SLUG, openListingList, openMyListings } from '@/features/listing/navigation';
import { routeForWebPath, webUrlForPath } from '@/lib/urls';

const isListingTile = (id: HomeTile['id']): id is keyof typeof LISTING_ROUTE_SLUG => id in LISTING_ROUTE_SLUG;

/** Ô lưới dịch vụ: tính năng Listing → danh sách; ride / sport (chưa có) → màn "Sắp có"; Tin của tôi → cần đăng nhập. */
export function openTile(tile: HomeTile) {
  if (tile.kind === 'utility') {
    if (tile.id === 'my_listings') requireAuth(() => openMyListings());
    else openListingList('all');
    return;
  }
  if (isListingTile(tile.id)) openListingList(LISTING_ROUTE_SLUG[tile.id]);
  else router.push({ pathname: '/groups/[kind]', params: { kind: tile.id } });
}

/** Chip "Tìm nhanh" → danh sách của tính năng với bộ lọc đặt sẵn. */
export function openShortcut(shortcut: HomeShortcut) {
  openListingList(LISTING_ROUTE_SLUG[shortcut.feature], { shortcut: shortcut.id });
}

/**
 * Link banner (banners.link_url): `https://…` → trình duyệt trong app; đường dẫn web có màn tương ứng → điều hướng
 * nội bộ (cần đăng nhập thì requireAuth trước); đường dẫn web khác → mở trang web.
 */
export function openWebLink(link: string) {
  if (/^https:\/\//.test(link)) {
    void WebBrowser.openBrowserAsync(link);
    return;
  }
  const route = routeForWebPath(link);
  if (!route) {
    void WebBrowser.openBrowserAsync(webUrlForPath(link));
    return;
  }
  if (route.auth) requireAuth(() => router.push(route.href));
  else router.push(route.href);
}

/** Chuông → màn Thông báo (đang là "Sắp có" tới khi có trung tâm thông báo). */
export function openNotifications() {
  requireAuth(() => router.push('/notifications'));
}

/** Avatar ở header → tab Tôi. */
export function openMe() {
  router.navigate('/me');
}
