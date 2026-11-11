// Tìm trọ — chỉ là config cho engine features/listing (quy tắc vàng). Tuần 9: lọc khoảng cách tới khu làm việc
// (chip Khoảng cách: Mọi khoảng cách / < 1 / < 2 / < 5 km), thẻ có "Cách <khu> <khoảng cách>", đăng tin cần ≥ 3 ảnh.
// Stitch L1: lọc nhanh Có gác / Chỗ để xe; thẻ nhấn giá tháng + diện tích · có gác · ở tối đa; liên hệ chính là Gọi
// (Hiện số → Gọi); mẹo xem phòng tận nơi, không đặt cọc qua mạng.
// Chế độ bản đồ cluster: chờ key Goong + src/ui/MapView (chưa có thư viện bản đồ).
// Stitch L2 (form): thẻ danh mục có icon; diện tích lên bước Thông tin chính; mẹo chụp ảnh phòng.
import { LISTING_FEATURES, LISTING_IMAGES } from '@hp/shared';
import { House, Users } from 'lucide-react-native';
import type { ListingFeatureConfig } from '@/features/listing/types';

export const roomConfig: ListingFeatureConfig = {
  key: 'room',
  slug: 'room',
  categories: LISTING_FEATURES.room,
  color: 'room',
  titleKey: 'common:feature.room',
  subtitleKey: 'listing:list.subtitle_room',
  tipKey: 'listing:tip.room',
  quickFilters: [
    { key: 'has_loft', value: true },
    { key: 'has_parking', value: true },
  ],
  card: { variant: 'grid', estimatedHeight: 320, display: { facts: ['area_m2', 'has_loft', 'max_people'] } },
  filters: ['subcategory', 'site', 'distance'],
  distanceOptionsKm: [1, 2, 5],
  categoryIcons: { room_rent: House, room_share: Users },
  form: {
    photos: 'recommended',
    price: true,
    defaultPriceType: 'fixed',
    minPhotos: LISTING_IMAGES.roomMin,
    primaryAttributes: ['area_m2'],
    photosTipKey: 'listing:form.photos_tip.room',
  },
  detail: { primaryCta: 'call' },
};
