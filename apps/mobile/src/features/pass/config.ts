// Pass đồ — chỉ là config cho engine features/listing (quy tắc vàng).
// Stitch L1: lọc nhanh theo tình trạng / xe máy; thẻ có nhãn tình trạng · loại đồ; mẹo hẹn xem đồ nơi đông người.
// Stitch L2 (form): thẻ danh mục có icon; loại đồ + tình trạng lên bước Thông tin chính; mẹo chụp ảnh.
// Trang chủ riêng (chợ đồ cũ trong super app): lưới 10 danh mục → banner app_pass → Gần {khu} · Cho tặng · Xe cộ / Điện tử /
// Điện lạnh mới đăng → "Tất cả tin Pass đồ" có lọc khoảng giá, sắp xếp, chip "Cho tặng".
import { LISTING_FEATURES, PASS_PRICE_RANGES } from '@hp/shared';
import { Baby, Bike, Dumbbell, HardHat, Package, Refrigerator, Shirt, Smartphone, Sofa, Wrench } from 'lucide-react-native';
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
    { freeOnly: true, labelKey: 'listing:list.quick_free' },
    { key: 'condition', value: 'new' },
    { key: 'condition', value: 'like_new' },
    { key: 'vehicle_type', value: 'motorbike' },
  ],
  // Đồ cần nhìn ảnh → lưới 2 cột. Mỗi danh mục có đúng một khoá "loại" → thẻ hiện tình trạng · loại đồ.
  card: {
    variant: 'grid',
    estimatedHeight: 300,
    display: {
      facts: [
        'condition',
        'vehicle_type',
        'device_type',
        'appliance_type',
        'home_type',
        'fashion_type',
        'sport_type',
        'tool_type',
        'baby_type',
        'item_type',
      ],
    },
  },
  filters: ['subcategory', 'site', 'price', 'sort'],
  priceRanges: PASS_PRICE_RANGES,
  categoryIcons: {
    pass_electronics: Smartphone,
    pass_vehicle: Bike,
    pass_appliance: Refrigerator,
    pass_home: Sofa,
    pass_fashion: Shirt,
    pass_sport: Dumbbell,
    pass_tools: Wrench,
    pass_baby: Baby,
    pass_ppe: HardHat,
    pass_other: Package,
  },
  home: {
    bannerPlacement: 'app_pass',
    rails: [
      { key: 'near', kind: 'near' },
      { key: 'free', kind: 'free' },
      { key: 'vehicle', kind: 'category', category: 'pass_vehicle' },
      { key: 'electronics', kind: 'category', category: 'pass_electronics' },
      { key: 'appliance', kind: 'category', category: 'pass_appliance' },
    ],
  },
  form: {
    photos: 'recommended',
    price: true,
    defaultPriceType: 'fixed',
    // Khoá "loại" của từng danh mục (khoá không có trong danh mục bị bỏ qua) rồi tình trạng.
    primaryAttributes: [
      'device_type',
      'vehicle_type',
      'appliance_type',
      'home_type',
      'fashion_type',
      'sport_type',
      'tool_type',
      'baby_type',
      'item_type',
      'condition',
    ],
    photosTipKey: 'listing:form.photos_tip.pass',
  },
  detail: { primaryCta: 'chat' },
};
