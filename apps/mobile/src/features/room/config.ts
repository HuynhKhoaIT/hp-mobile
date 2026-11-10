// Tìm trọ — chỉ là config cho engine features/listing (quy tắc vàng). Tuần 9: lọc khoảng cách tới khu làm việc
// (chip Mọi khoảng cách / < 1 / < 2 / < 5 km), thẻ có "Cách <khu> <khoảng cách>", đăng tin cần ≥ 3 ảnh.
// Chế độ bản đồ cluster: chờ key Goong + src/ui/MapView (chưa có thư viện bản đồ).
import { LISTING_FEATURES, LISTING_IMAGES } from '@hp/shared';
import type { ListingFeatureConfig } from '@/features/listing/types';

export const roomConfig: ListingFeatureConfig = {
  key: 'room',
  slug: 'room',
  categories: LISTING_FEATURES.room,
  color: 'room',
  titleKey: 'common:feature.room',
  card: { variant: 'grid', estimatedHeight: 300 },
  filters: ['subcategory', 'site', 'distance'],
  distanceOptionsKm: [1, 2, 5],
  form: { photos: 'recommended', price: true, defaultPriceType: 'fixed', minPhotos: LISTING_IMAGES.roomMin },
};
