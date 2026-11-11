// Pass đồ — chỉ là config cho engine features/listing (quy tắc vàng).
// Stitch L1: lọc nhanh theo tình trạng / xe máy; thẻ có nhãn tình trạng · loại đồ; mẹo hẹn xem đồ nơi đông người.
// Stitch L2 (form): thẻ danh mục có icon; loại đồ + tình trạng lên bước Thông tin chính; mẹo chụp ảnh.
// Mini-app "Chợ Pass Đồ" (Stitch "Sub-App Chợ Pass"): bấm Pass đồ ở super app mở mini/pass có thanh tab riêng — trang chủ
// chợ (6 ô danh mục + Cho tặng + Tất cả mục → banner app_pass hoặc khối "An tâm trao tay" → lưới tin mới), Đã lưu, Chat,
// Quản lý tin, Bộ lọc (khoảng cách tới khu < 2 / 5 / 10 km). Không còn dải tin trên trang chủ (Stitch không có) — engine
// `home.rails` vẫn giữ cho tính năng khác.
import { LISTING_FEATURES, PASS_PRICE_RANGES } from '@hp/shared';
import { Baby, Bike, Dumbbell, HardHat, Package, Refrigerator, Shirt, ShoppingBag, Smartphone, Sofa, Wrench } from 'lucide-react-native';
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
  // Đồ cần nhìn ảnh → lưới 2 cột. Mỗi danh mục có đúng một khoá "loại" → thẻ hiện tình trạng · loại đồ. Tim lưu tin trên
  // thẻ (Stitch Chợ Pass — tab Đã lưu của mini-app).
  card: {
    variant: 'grid',
    estimatedHeight: 300,
    display: {
      bookmark: true,
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
  // Mốc "Khoảng cách tới khu" ở màn Bộ lọc của mini-app.
  distanceOptionsKm: [2, 5, 10],
  miniApp: {
    titleKey: 'listing:mini_app.title.pass',
    subtitleKey: 'listing:mini_app.subtitle.pass',
    homeTabKey: 'listing:mini_app.tabs.home.pass',
    icon: ShoppingBag,
    bannerPlacement: 'app_pass',
    homeCategoryCount: 6,
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
