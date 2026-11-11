// Điều hướng từ Hub: ô dịch vụ, chip "Tìm nhanh", chuông thông báo. Đường dẫn route của tin đăng lấy từ engine listing
// (LISTING_ROUTE_SLUG); link banner mở qua openWebLink (src/lib/urls.ts).
import type { HomeShortcut, HomeTile } from '@hp/shared';
import { router } from 'expo-router';
import { requireAuth } from '@/core/auth';
import { openGroupList } from '@/features/group/navigation';
import { LISTING_ROUTE_SLUG, openListingList, openMyListings } from '@/features/listing/navigation';

const isListingTile = (id: HomeTile['id']): id is keyof typeof LISTING_ROUTE_SLUG => id in LISTING_ROUTE_SLUG;

/** Ô lưới dịch vụ: tính năng Listing → danh sách tin; ride / sport → danh sách nhóm (tuần 7); Tin của tôi → cần đăng nhập. */
export function openTile(tile: HomeTile) {
  if (tile.kind === 'utility') {
    if (tile.id === 'my_listings') requireAuth(() => openMyListings());
    else openListingList('all');
    return;
  }
  if (isListingTile(tile.id)) openListingList(LISTING_ROUTE_SLUG[tile.id]);
  else openGroupList(tile.id);
}

/** Chip "Tìm nhanh" → danh sách của tính năng với bộ lọc đặt sẵn. */
export function openShortcut(shortcut: HomeShortcut) {
  openListingList(LISTING_ROUTE_SLUG[shortcut.feature], { shortcut: shortcut.id });
}

/** Chuông → màn Thông báo (đang là "Sắp có" tới khi có trung tâm thông báo). */
export function openNotifications() {
  requireAuth(() => router.push('/notifications'));
}

/** Avatar ở header → tab Tôi. */
export function openMe() {
  router.navigate('/me');
}
