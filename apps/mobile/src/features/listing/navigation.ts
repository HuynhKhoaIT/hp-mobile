// Điều hướng của engine Listing — một chỗ cho đường dẫn route (app/listings/[feature], app/listing/[id]).
import type { ListingFeature } from '@hp/shared';
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

export function openListing(id: string) {
  router.push({ pathname: '/listing/[id]', params: { id } });
}

export function openListingList(slug: ListingFeatureConfig['slug'], params: { site?: string } = {}) {
  router.push({ pathname: '/listings/[feature]', params: { feature: slug, ...params } });
}
