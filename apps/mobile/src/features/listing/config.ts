// Danh sách mọi tin (Hub → "Xem tất cả"): không phải một tính năng, dùng chung engine như 4 tính năng Listing.
import { LISTING_CATEGORIES } from '@hp/shared';
import type { ListingFeatureConfig } from './types';

export const allListingsConfig: ListingFeatureConfig = {
  key: 'all',
  slug: 'all',
  categories: LISTING_CATEGORIES,
  color: null,
  titleKey: 'listing:list.title_all',
  searchPlaceholderKey: 'common:nav.search_placeholder',
  card: { variant: 'row', estimatedHeight: 140 },
  filters: ['subcategory', 'site'],
};
