// Pass đồ — chỉ là config cho engine features/listing (quy tắc vàng).
import { LISTING_FEATURES } from '@hp/shared';
import type { ListingFeatureConfig } from '@/features/listing/types';

export const passConfig: ListingFeatureConfig = {
  key: 'pass',
  slug: 'pass',
  categories: LISTING_FEATURES.pass,
  color: 'pass',
  titleKey: 'common:feature.pass',
  // Đồ cần nhìn ảnh → lưới 2 cột.
  card: { variant: 'grid', estimatedHeight: 300 },
  filters: ['subcategory', 'site'],
};
