// Registry cấu hình 4 tính năng Listing + 2 tính năng Group — nơi duy nhất gom các config.ts lại cho route (danh sách,
// chi tiết, đăng / tạo, mini-app) và cho điều hướng vào tính năng (Hub, link web — hasMiniApp). Engine features/listing,
// features/group không import feature khác: route lấy config ở đây rồi truyền vào component của engine.
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

/**
 * Tham số route có mini-app riêng (config.miniApp — vd Pass đồ → Chợ Pass Đồ): Hub, link web, banner mở `mini/[feature]`
 * thay cho danh sách `listings/[feature]`. Chỉ đọc config (không import engine) để lib/urls dùng được, không vòng import.
 */
export function hasMiniApp(slug: string): slug is Exclude<ListingFeatureConfig['slug'], 'all'> {
  return slug !== 'all' && !!LISTING_CONFIGS_BY_SLUG[slug]?.miniApp;
}

export function configOfCategory(category: ListingCategory): ListingFeatureConfig {
  return LISTING_CONFIGS[featureOfCategory(category)];
}

export const GROUP_CONFIGS: Record<GroupKind, GroupFeatureConfig> = {
  ride: rideConfig,
  sport: sportConfig,
};

/** Tham số route `groups/[kind]`, `group/new/[kind]` → kind hợp lệ. */
export const isGroupKind = (v: string | undefined): v is GroupKind => !!v && (GROUP_KINDS as readonly string[]).includes(v);
