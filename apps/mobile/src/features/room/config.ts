// Tìm trọ — chỉ là config cho engine features/listing (quy tắc vàng). Bản đồ cluster, filter diện tích… ở tuần 9.
import { LISTING_FEATURES } from '@hp/shared';
import type { ListingFeatureConfig } from '@/features/listing/types';

export const roomConfig: ListingFeatureConfig = {
  key: 'room',
  slug: 'room',
  categories: LISTING_FEATURES.room,
  color: 'room',
  titleKey: 'common:feature.room',
  card: { variant: 'grid', estimatedHeight: 300 },
  filters: ['subcategory', 'site'],
};
