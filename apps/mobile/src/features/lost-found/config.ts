// Đồ thất lạc — chỉ là config cho engine features/listing (quy tắc vàng). "Đã nhận lại", match tức thì ở tuần 9.
import { LISTING_FEATURES } from '@hp/shared';
import type { ListingFeatureConfig } from '@/features/listing/types';

export const lostFoundConfig: ListingFeatureConfig = {
  key: 'lostFound',
  slug: 'lost-found',
  categories: LISTING_FEATURES.lostFound,
  color: 'lostFound',
  titleKey: 'common:feature.lostFound',
  card: { variant: 'row', estimatedHeight: 140 },
  filters: ['subcategory', 'site'],
  form: { photos: 'optional', price: false, defaultPriceType: 'free' },
};
