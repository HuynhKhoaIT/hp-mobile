// Tìm trọ — /tro. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
// Lọc khoảng cách tới khu làm việc (?distance=1|2|5, tuần 9). Chế độ bản đồ: chờ key Goong.
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
  distanceFilterKm: [1, 2, 5],
};
