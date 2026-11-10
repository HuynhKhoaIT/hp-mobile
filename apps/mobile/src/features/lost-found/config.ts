// Đồ thất lạc — chỉ là config cho engine features/listing (quy tắc vàng). Tuần 9: chủ tin thấy "Tin có thể khớp"
// (trigger khớp mất ↔ nhặt + push lost_found_match) và nút "Đã nhận lại đồ" ở chi tiết (detail.lostFound).
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
  detail: { lostFound: true },
};
