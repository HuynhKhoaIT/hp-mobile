// Điều hướng từ Hub: ô dịch vụ, chip "Tìm nhanh", chuông thông báo. Đường dẫn route của tin đăng lấy từ engine listing
// (LISTING_ROUTE_SLUG); link banner mở qua openWebLink (src/lib/urls.ts). Tính năng có mini-app (config.miniApp — Pass đồ
// → Chợ Pass Đồ; registry features/configs) mở mini-app thay cho danh sách.
import type { HomeShortcut, HomeTile, ListingCategory } from '@hp/shared';
import { router } from 'expo-router';
import { requireAuth } from '@/core/auth';
import { hasMiniApp } from '@/features/configs';
import { openGroupList } from '@/features/group/navigation';
import { LISTING_ROUTE_SLUG, openListingList, openMiniApp, openMyListings } from '@/features/listing/navigation';
import type { ListingFeatureConfig } from '@/features/listing/types';

/** Vào một tính năng Listing (ô dịch vụ, "Xem tất cả", "Tìm nhanh"): có mini-app → mini-app, không thì danh sách. */
export function openFeature(
  slug: ListingFeatureConfig['slug'],
  params: { site?: string; shortcut?: string; categories?: readonly ListingCategory[] } = {},
) {
  if (hasMiniApp(slug)) openMiniApp(slug, params);
  else openListingList(slug, params);
}

const isListingTile = (id: HomeTile['id']): id is keyof typeof LISTING_ROUTE_SLUG => id in LISTING_ROUTE_SLUG;

/** Ô lưới dịch vụ: tính năng Listing → danh sách tin; ride / sport → danh sách nhóm (tuần 7); Tin của tôi → cần đăng nhập. */
export function openTile(tile: HomeTile) {
  if (tile.kind === 'utility') {
    if (tile.id === 'my_listings') requireAuth(() => openMyListings());
    else openListingList('all');
    return;
  }
  if (isListingTile(tile.id)) openFeature(LISTING_ROUTE_SLUG[tile.id]);
  else openGroupList(tile.id);
}

/** Chip "Tìm nhanh" → danh sách của tính năng với bộ lọc đặt sẵn. */
export function openShortcut(shortcut: HomeShortcut) {
  openFeature(LISTING_ROUTE_SLUG[shortcut.feature], { shortcut: shortcut.id });
}

/** Chuông → màn Thông báo (đang là "Sắp có" tới khi có trung tâm thông báo). */
export function openNotifications() {
  requireAuth(() => router.push('/notifications'));
}

/** Avatar ở header → tab Tôi. */
export function openMe() {
  router.navigate('/me');
}
