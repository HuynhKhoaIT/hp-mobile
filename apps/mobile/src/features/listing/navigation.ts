// Điều hướng của engine Listing — một chỗ cho đường dẫn route (listings/[feature], listing/[id], đăng / sửa tin,
// tin của tôi, tin đã lưu, tìm kiếm).
import type { MyListingsTab } from '@hp/core';
import type { ListingCategory, ListingFeature } from '@hp/shared';
import { router } from 'expo-router';
import type { ListingFeatureConfig } from './types';

/** Mã tính năng → tham số route `listings/[feature]` (thư mục feature dùng kebab-case). */
export const LISTING_ROUTE_SLUG: Record<ListingFeature, Exclude<ListingFeatureConfig['slug'], 'all'>> = {
  pass: 'pass',
  room: 'room',
  job: 'job',
  lostFound: 'lost-found',
};

/** Quay lại; mở thẳng từ link / push (không có màn trước) → về trang chủ. */
export function backOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function openListing(id: string, opts: { replace?: boolean } = {}) {
  const href = { pathname: '/listing/[id]', params: { id } } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

/**
 * Danh sách tin của một tính năng. `site`: đặt sẵn khu; `shortcut`: id chip "Tìm nhanh" (HOME_SHORTCUTS);
 * `categories`: nhóm category đặt sẵn (vd "Dành cho bạn") — xem useListingPreset.
 */
export function openListingList(
  slug: ListingFeatureConfig['slug'],
  params: { site?: string; shortcut?: string; categories?: readonly ListingCategory[] } = {},
) {
  const { categories, ...rest } = params;
  const extra = Object.fromEntries(Object.entries(rest).filter(([, v]) => !!v)) as Record<string, string>;
  router.push({
    pathname: '/listings/[feature]',
    params: { feature: slug, ...extra, ...(categories?.length ? { categories: categories.join(',') } : {}) },
  });
}

/** Bước 0 của "Đăng nhanh": chọn loại tin (đặt sẵn tính năng khi đến từ danh sách của tính năng đó). */
export function openPostPicker(feature?: ListingFeature) {
  router.push({ pathname: '/listing/new', params: feature ? { feature } : {} });
}

/** Form đăng tin của một danh mục (bước 1–3). */
export function openPostForm(category: ListingCategory, opts: { replace?: boolean } = {}) {
  const href = { pathname: '/listing/new/[category]', params: { category } } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

export function openEditListing(id: string, opts: { replace?: boolean } = {}) {
  const href = { pathname: '/listing/edit/[id]', params: { id } } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

export function openMyListings(tab?: MyListingsTab, opts: { replace?: boolean } = {}) {
  const href = { pathname: '/my-listings', params: tab ? { tab } : {} } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

export function openSavedListings() {
  router.push('/saved');
}

export function openSearch() {
  router.push('/search');
}

// ── Mini-app (config.miniApp — vd Chợ Pass Đồ): route mini/[feature] có thanh tab riêng ─────────────────────────────

/** Tab của mini-app (`index` = trang chủ chợ; `filter` = màn Bộ lọc, không có ô trên thanh tab). */
export type MiniAppTab = 'index' | 'saved' | 'chat' | 'manage' | 'filter';

type MiniSlug = Exclude<ListingFeatureConfig['slug'], 'all'>;

/** Bộ lọc đặt sẵn khi mở mini-app (giống openListingList): khu, chip "Tìm nhanh", nhóm category. */
export type MiniAppParams = { site?: string; shortcut?: string; categories?: string };

/** Href trang chủ mini-app (kèm bộ lọc đặt sẵn) — dùng cả cho Redirect từ `listings/[feature]` và link web. */
export function miniAppHref(slug: MiniSlug, params: MiniAppParams = {}) {
  const extra = Object.fromEntries(Object.entries(params).filter(([, v]) => !!v)) as Record<string, string>;
  return { pathname: '/mini/[feature]', params: { feature: slug, ...extra } } as const;
}

/** Mở mini-app của tính năng (Hub, link web, banner). */
export function openMiniApp(slug: MiniSlug, params: { site?: string; shortcut?: string; categories?: readonly ListingCategory[] } = {}) {
  const { categories, ...rest } = params;
  router.push(miniAppHref(slug, { ...rest, ...(categories?.length ? { categories: categories.join(',') } : {}) }));
}

/** Chuyển tab trong mini-app đang mở. */
export function openMiniTab(slug: MiniSlug, tab: MiniAppTab) {
  const params = { feature: slug };
  switch (tab) {
    case 'index':
      return router.navigate({ pathname: '/mini/[feature]', params });
    case 'saved':
      return router.navigate({ pathname: '/mini/[feature]/saved', params });
    case 'chat':
      return router.navigate({ pathname: '/mini/[feature]/chat', params });
    case 'manage':
      return router.navigate({ pathname: '/mini/[feature]/manage', params });
    case 'filter':
      return router.navigate({ pathname: '/mini/[feature]/filter', params });
  }
}

/** Rời mini-app về super app (gỡ cả route mini-app khỏi stack gốc); mở thẳng từ link (không có màn trước) → Hub. */
export function leaveMiniApp() {
  if (router.canDismiss()) router.dismiss();
  else router.replace('/');
}
