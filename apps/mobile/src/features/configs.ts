// Registry cấu hình 4 tính năng Listing — nơi duy nhất gom các config.ts lại cho route (danh sách, đăng tin, sửa tin).
// Engine features/listing không import feature khác: route lấy config ở đây rồi truyền vào component của engine.
import { featureOfCategory, type ListingCategory, type ListingFeature } from '@hp/shared';
import { jobConfig } from './job/config';
import { allListingsConfig } from './listing/config';
import type { ListingFeatureConfig } from './listing/types';
import { lostFoundConfig } from './lost-found/config';
import { passConfig } from './pass/config';
import { roomConfig } from './room/config';

export const LISTING_CONFIGS: Record<ListingFeature, ListingFeatureConfig> = {
  pass: passConfig,
  room: roomConfig,
  job: jobConfig,
  lostFound: lostFoundConfig,
};

/** Tham số route `listings/[feature]` → config (gồm danh sách tổng hợp 'all'). */
export const LISTING_CONFIGS_BY_SLUG: Record<string, ListingFeatureConfig> = {
  pass: passConfig,
  room: roomConfig,
  job: jobConfig,
  'lost-found': lostFoundConfig,
  all: allListingsConfig,
};

export function configOfCategory(category: ListingCategory): ListingFeatureConfig {
  return LISTING_CONFIGS[featureOfCategory(category)];
}
