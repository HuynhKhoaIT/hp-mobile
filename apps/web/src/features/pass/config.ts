// Pass đồ — /pass-do. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
// Chợ đồ cũ kiểu Chợ Tốt ("Trang chủ riêng", khớp app): 10 danh mục có icon, lọc giá theo khoảng (?price=), sắp xếp (?sort=),
// chip "Cho tặng" (?free=1).
// Mini-app "Chợ Pass Đồ" (Stitch pass_home / saved / manage / filter): điều hướng riêng (Chợ Pass · Đã lưu · Đăng tin · Chat ·
// Quản lý tin), trang chủ mini-app (6 danh mục đầu + Cho tặng + Tất cả mục → banner web_pass hoặc "An tâm trao tay" → tin mới)
// thay cho trang chủ mini kiểu dải (`home.rails` — Stitch không có dải; engine FeatureHome vẫn giữ cho tính năng khác), trang
// bộ lọc có khoảng cách (< 2 / 5 / 10 km) và ô giá tối thiểu / tối đa.
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { LISTING_FEATURES, PASS_PRICE_RANGES } from '@hp/shared';
import { Baby, Bike, Dumbbell, HardHat, Package, Refrigerator, Shirt, Smartphone, Sofa, Wrench } from 'lucide-react';
import type { ListingFeatureConfig } from '@/features/listing/feature-config';
import { miniAppPaths } from '@/features/listing/mini-app-routes';

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
  distanceFilterKm: [2, 5, 10],
  customPrice: true,
  miniApp: {
    titleKey: 'listing.mini_app.title.pass',
    subtitleKey: 'listing.mini_app.subtitle.pass',
    homeTabKey: 'listing.mini_app.tabs.home.pass',
    bannerPlacement: 'web_pass',
    homeCategoryCount: 6,
    paths: miniAppPaths(LISTING_FEATURE_PATHS.pass),
  },
};
