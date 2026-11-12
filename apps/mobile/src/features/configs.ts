// Registry cấu hình 4 tính năng Listing + 2 tính năng Group — nơi duy nhất gom các config.ts lại cho route (danh sách,
// chi tiết, đăng / tạo, mini-app) và cho điều hướng vào tính năng (Hub, link web — hasMiniApp). Engine features/listing,
// features/group không import feature khác: route lấy config ở đây rồi truyền vào component của engine.
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { featureOfCategory, GROUP_KINDS, type GroupKind, type ListingCategory, type ListingFeature } from '@hp/shared';
import type { GroupFeatureConfig } from './group/types';
import { jobConfig } from './job/config';
import { allListingsConfig } from './listing/config';
import type { MiniAppTab, MiniSlug } from './listing/navigation';
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

/**
 * Trang con của mini-app trên web (apps/web features/listing/mini-app-routes.ts: `{gốc}/bo-loc | da-luu | tin-nhan |
 * quan-ly | dang-tin`) → tab của app (tên route `mini/[feature]/<tab>`) hoặc 'post' (luồng đăng của mini-app).
 */
const MINI_APP_WEB_PAGES: Readonly<Record<string, Exclude<MiniAppTab, 'index'> | 'post'>> = {
  'bo-loc': 'filter',
  'da-luu': 'saved',
  'tin-nhan': 'chat',
  'quan-ly': 'manage',
  'dang-tin': 'post',
};

export type MiniAppWebPage = { feature: ListingFeature; slug: MiniSlug; page: MiniAppTab | 'post' };

/**
 * Đường dẫn web (đã bỏ tiền tố ngôn ngữ, không query) thuộc mini-app nào: `/pass-do` → trang chủ, `/pass-do/da-luu` → tab
 * Đã lưu… Trang con lạ → trang chủ mini-app. Không thuộc mini-app → null. Thuần chuỗi (dùng cả ở +native-intent).
 */
export function miniAppWebPage(path: string): MiniAppWebPage | null {
  for (const feature of Object.keys(LISTING_CONFIGS) as ListingFeature[]) {
    const { slug } = LISTING_CONFIGS[feature];
    const base = LISTING_FEATURE_PATHS[feature];
    if (!hasMiniApp(slug) || (path !== base && !path.startsWith(`${base}/`))) continue;
    const sub = path.slice(base.length + 1).split('/')[0] ?? '';
    return { feature, slug, page: MINI_APP_WEB_PAGES[sub] ?? 'index' };
  }
  return null;
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
