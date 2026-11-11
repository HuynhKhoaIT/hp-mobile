// Tìm trọ — chỉ là config cho engine features/listing (quy tắc vàng). Tuần 9: lọc khoảng cách tới khu làm việc
// (chip Khoảng cách: Mọi khoảng cách / < 1 / < 2 / < 5 km), thẻ có "Cách <khu> <khoảng cách>", đăng tin cần ≥ 3 ảnh.
// Stitch L1: lọc nhanh Có gác / Chỗ để xe; thẻ nhấn giá tháng + diện tích · có gác · ở tối đa; liên hệ chính là Gọi
// (Hiện số → Gọi); mẹo xem phòng tận nơi, không đặt cọc qua mạng.
// Chế độ bản đồ cluster: chờ key Goong + src/ui/MapView (chưa có thư viện bản đồ).
// Stitch L2 (form): thẻ danh mục có icon; diện tích lên bước Thông tin chính; mẹo chụp ảnh phòng.
// Stitch L3 ("Tìm phòng trọ & Nhà trọ"): chip "Dưới 1 triệu/tháng" (p_price_max); thẻ có dòng chủ trọ (+ dấu xác minh) và
// nút tim lưu tin; dải "Bạn là chủ trọ? Đăng tin" đầu danh sách mở thẳng form phòng cho thuê.
import { LISTING_FEATURES, LISTING_IMAGES } from '@hp/shared';
import { House, Plus, Users } from 'lucide-react-native';
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
    { priceMax: 1_000_000, labelKey: 'listing:list.quick_price_under_1m' },
  ],
  banner: {
    variant: 'strip',
    textKey: 'listing:list.banner.landlord_text',
    actions: [{ labelKey: 'listing:list.banner.landlord_cta', category: 'room_rent', icon: Plus }],
  },
  card: {
    variant: 'grid',
    estimatedHeight: 360,
    display: { facts: ['area_m2', 'has_loft', 'max_people'], owner: true, bookmark: true },
  },
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
