// Tìm trọ — /tro. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
// Bản đồ + lọc khoảng cách tới nhà máy: tuần 8.
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { LISTING_FEATURES } from '@hp/shared';
import { House } from 'lucide-react';
import type { ListingFeatureConfig } from '@/features/listing/feature-config';

export const roomConfig: ListingFeatureConfig = {
  feature: 'room',
  path: LISTING_FEATURE_PATHS.room,
  categories: LISTING_FEATURES.room,
  Icon: House,
  tone: { soft: 'bg-service-room-soft', fg: 'text-service-room' },
  cardLayout: 'grid',
  jsonLd: 'accommodation',
};
