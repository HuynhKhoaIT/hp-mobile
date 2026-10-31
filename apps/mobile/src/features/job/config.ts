// Tìm việc — chỉ là config cho engine features/listing (quy tắc vàng).
import { LISTING_FEATURES } from '@hp/shared';
import type { ListingFeatureConfig } from '@/features/listing/types';

export const jobConfig: ListingFeatureConfig = {
  key: 'job',
  slug: 'job',
  categories: LISTING_FEATURES.job,
  color: 'job',
  titleKey: 'common:feature.job',
  // Tin việc ít ảnh, cần đọc lương + khu → thẻ hàng ngang, một cột.
  card: { variant: 'row', estimatedHeight: 140 },
  filters: ['subcategory', 'site'],
  form: { photos: 'optional', price: false, defaultPriceType: 'negotiable' },
};
