// Pass đồ — /pass-do. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { LISTING_FEATURES } from '@hp/shared';
import { Package } from 'lucide-react';
import type { ListingFeatureConfig } from '@/features/listing/feature-config';

export const passConfig: ListingFeatureConfig = {
  feature: 'pass',
  path: LISTING_FEATURE_PATHS.pass,
  categories: LISTING_FEATURES.pass,
  Icon: Package,
  tone: { soft: 'bg-service-pass-soft', fg: 'text-service-pass' },
  cardLayout: 'grid',
  jsonLd: 'product',
};
