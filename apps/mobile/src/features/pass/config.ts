// Pass đồ — chỉ là config cho engine features/listing (quy tắc vàng).
// Stitch L1: lọc nhanh theo tình trạng / xe máy; thẻ có nhãn tình trạng · loại xe; mẹo hẹn xem đồ nơi đông người.
// Stitch L2 (form): thẻ danh mục có icon; tình trạng / loại xe lên bước Thông tin chính; mẹo chụp ảnh.
import { LISTING_FEATURES } from '@hp/shared';
import { Bike, HardHat, Smartphone, Sofa } from 'lucide-react-native';
import type { ListingFeatureConfig } from '@/features/listing/types';

export const passConfig: ListingFeatureConfig = {
  key: 'pass',
  slug: 'pass',
  categories: LISTING_FEATURES.pass,
  color: 'pass',
  titleKey: 'common:feature.pass',
  subtitleKey: 'listing:list.subtitle_pass',
  tipKey: 'listing:tip.pass',
  quickFilters: [
    { key: 'condition', value: 'new' },
    { key: 'condition', value: 'like_new' },
    { key: 'vehicle_type', value: 'motorbike' },
  ],
  // Đồ cần nhìn ảnh → lưới 2 cột.
  card: { variant: 'grid', estimatedHeight: 300, display: { facts: ['condition', 'vehicle_type'] } },
  filters: ['subcategory', 'site'],
  categoryIcons: { pass_electronics: Smartphone, pass_vehicle: Bike, pass_ppe: HardHat, pass_home: Sofa },
  form: {
    photos: 'recommended',
    price: true,
    defaultPriceType: 'fixed',
    primaryAttributes: ['condition', 'vehicle_type'],
    photosTipKey: 'listing:form.photos_tip.pass',
  },
  detail: { primaryCta: 'chat' },
};
