// Registry cấu hình 4 tính năng Listing + 2 tính năng Group — nơi duy nhất gom các config.ts lại cho route (danh sách,
// chi tiết, đăng / tạo). Engine features/listing, features/group không import feature khác: route lấy config ở đây rồi
// truyền vào component của engine.
import { featureOfCategory, GROUP_KINDS, type GroupKind, type ListingCategory, type ListingFeature } from '@hp/shared';
import type { GroupFeatureConfig } from './group/types';
import { jobConfig } from './job/config';
import { allListingsConfig } from './listing/config';
import type { ListingFeatureConfig } from './listing/types';
import { lostFoundConfig } from './lost-found/config';
import { passConfig } from './pass/config';
import { rideConfig } from './ride/config';
import { roomConfig } from './room/config';
import { sportConfig } from './sport/config';

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

export const GROUP_CONFIGS: Record<GroupKind, GroupFeatureConfig> = {
  ride: rideConfig,
  sport: sportConfig,
};

/** Tham số route `groups/[kind]`, `group/new/[kind]` → kind hợp lệ. */
export const isGroupKind = (v: string | undefined): v is GroupKind => !!v && (GROUP_KINDS as readonly string[]).includes(v);
