// Pass đồ — /pass-do. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { LISTING_FEATURES } from '@hp/shared';
import { Bike, HardHat, Package, Smartphone, Sofa } from 'lucide-react';
import type { ListingFeatureConfig } from '@/features/listing/feature-config';

export const passConfig: ListingFeatureConfig = {
  feature: 'pass',
  path: LISTING_FEATURE_PATHS.pass,
  categories: LISTING_FEATURES.pass,
  Icon: Package,
  tone: { soft: 'bg-service-pass-soft', fg: 'text-service-pass' },
  cardLayout: 'grid',
  jsonLd: 'product',
  // Stitch L1 (khớp app): lọc nhanh tình trạng / xe máy, thẻ có nhãn tình trạng · loại xe, mẹo hẹn xem đồ nơi đông người.
  card: { facts: ['condition', 'vehicle_type'] },
  quickFilters: [
    { key: 'condition', value: 'new' },
    { key: 'condition', value: 'like_new' },
    { key: 'vehicle_type', value: 'motorbike' },
  ],
  tipKey: 'listing.tip.pass',
  primaryCta: 'chat',
  // Stitch L2 (khớp app): thẻ danh mục có icon; tình trạng / loại xe lên bước Thông tin chính; mẹo chụp ảnh.
  categoryIcons: { pass_electronics: Smartphone, pass_vehicle: Bike, pass_ppe: HardHat, pass_home: Sofa },
  form: { primaryAttributes: ['condition', 'vehicle_type'], photosTipKey: 'listing.form.photos_tip.pass' },
};
