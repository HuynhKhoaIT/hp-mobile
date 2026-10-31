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

export function openListingList(slug: ListingFeatureConfig['slug'], params: { site?: string } = {}) {
  router.push({ pathname: '/listings/[feature]', params: { feature: slug, ...params } });
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
