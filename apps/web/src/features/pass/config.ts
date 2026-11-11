// Pass đồ — /pass-do. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
// Chợ đồ cũ kiểu Chợ Tốt ("Trang chủ riêng", khớp app): 10 danh mục có icon, lọc giá theo khoảng (?price=), sắp xếp (?sort=),
// chip "Cho tặng" (?free=1); chưa lọc → trang chủ mini (lưới danh mục → banner web_pass → dải gần khu / cho tặng / theo danh
// mục → "Tất cả tin Pass đồ").
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { LISTING_FEATURES, PASS_PRICE_RANGES } from '@hp/shared';
import { Baby, Bike, Dumbbell, HardHat, Package, Refrigerator, Shirt, Smartphone, Sofa, Wrench } from 'lucide-react';
import type { ListingFeatureConfig } from '@/features/listing/feature-config';

/** Khoá "loại đồ" của từng danh mục (mỗi tin chỉ có một) — lên đầu bước Thông tin chính + nhãn thẻ. */
const TYPE_KEYS = [
  'device_type',
  'vehicle_type',
  'appliance_type',
  'home_type',
  'fashion_type',
  'sport_type',
  'tool_type',
  'baby_type',
  'item_type',
] as const;

export const passConfig: ListingFeatureConfig = {
  feature: 'pass',
  path: LISTING_FEATURE_PATHS.pass,
  categories: LISTING_FEATURES.pass,
  Icon: Package,
  tone: { soft: 'bg-service-pass-soft', fg: 'text-service-pass' },
  cardLayout: 'grid',
  jsonLd: 'product',
  // Stitch L1 (khớp app): thẻ có nhãn tình trạng · loại đồ; lọc nhanh tình trạng / cho tặng / xe máy; mẹo hẹn xem đồ nơi đông người.
  card: { facts: ['condition', ...TYPE_KEYS] },
  quickFilters: [
    { key: 'condition', value: 'new' },
    { key: 'condition', value: 'like_new' },
    { freeOnly: true, labelKey: 'listing.list.quick_free' },
    { key: 'vehicle_type', value: 'motorbike' },
  ],
  priceRanges: PASS_PRICE_RANGES,
  sortable: true,
  tipKey: 'listing.tip.pass',
  primaryCta: 'chat',
  // Stitch L2 (khớp app): thẻ danh mục có icon; loại đồ + tình trạng lên bước Thông tin chính; mẹo chụp ảnh.
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
  form: { primaryAttributes: [...TYPE_KEYS, 'condition'], photosTipKey: 'listing.form.photos_tip.pass' },
  home: {
    bannerPlacement: 'web_pass',
    rails: [
      { key: 'near', kind: 'near' },
      { key: 'free', kind: 'free' },
      { key: 'vehicle', kind: 'category', category: 'pass_vehicle' },
      { key: 'electronics', kind: 'category', category: 'pass_electronics' },
      { key: 'appliance', kind: 'category', category: 'pass_appliance' },
    ],
  },
};
