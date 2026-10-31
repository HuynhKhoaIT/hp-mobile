// Đồ thất lạc — /that-lac. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
// Không có loại JSON-LD phù hợp (schema.org không có "đồ thất lạc") → không nhúng.
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { LISTING_FEATURES } from '@hp/shared';
import { Search } from 'lucide-react';
import type { ListingFeatureConfig } from '@/features/listing/feature-config';

export const lostFoundConfig: ListingFeatureConfig = {
  feature: 'lostFound',
  path: LISTING_FEATURE_PATHS.lostFound,
  categories: LISTING_FEATURES.lostFound,
  Icon: Search,
  tone: { soft: 'bg-service-lost-found-soft', fg: 'text-service-lost-found' },
  cardLayout: 'row',
  jsonLd: null,
};
