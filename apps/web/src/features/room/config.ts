// Tìm trọ — /tro. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
// Lọc khoảng cách tới khu làm việc (?distance=1|2|5, tuần 9). Chế độ bản đồ: chờ key Goong.
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { LISTING_FEATURES } from '@hp/shared';
import { House, Users } from 'lucide-react';
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
  // Stitch L1 (khớp app): thẻ nhấn giá tháng + diện tích · có gác · ở tối đa; lọc nhanh Có gác / Chỗ để xe; liên hệ chính là
  // Hiện số → Gọi; mẹo xem phòng tận nơi, không đặt cọc qua mạng.
  card: { facts: ['area_m2', 'has_loft', 'max_people'] },
  quickFilters: [
    { key: 'has_loft', value: true },
    { key: 'has_parking', value: true },
  ],
  tipKey: 'listing.tip.room',
  primaryCta: 'call',
  // Stitch L2 (khớp app): thẻ danh mục có icon; diện tích lên bước Thông tin chính; mẹo chụp ảnh phòng.
  categoryIcons: { room_rent: House, room_share: Users },
  form: { primaryAttributes: ['area_m2'], photosTipKey: 'listing.form.photos_tip.room' },
};
