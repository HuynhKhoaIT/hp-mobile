// Đọc phía server cho trang chủ (Hub) — phần CÔNG KHAI, giống nhau với mọi người (docs/design/home.md §5):
// banner, dải theo dịch vụ, dải "Gần {khu}" của khu mặc định, số liệu cộng đồng. Client ẩn danh + 'use cache' (300s,
// tag `banners` / `listings`) → trang chủ prerender tĩnh, không đọc cookie. Phần theo người dùng đọc ở trình duyệt.
// Lỗi: trả null (không cache lỗi) → component client của khối đó tự tải lại ở trình duyệt / hiện lỗi + Thử lại; một khối
// lỗi không làm hỏng cả trang. Banner + dải tin dùng chung với trang chủ mini của tính năng (/pass-do — feature-home.tsx).
import 'server-only';
import { type Banner, type BannerPlacement, listBanners, type PublicListing } from '@hp/core';
import { HOME_RAIL_SIZE, LISTING_CATEGORIES, LISTING_FEATURES, type ListingFeature, type Locale } from '@hp/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { getListPage, getPublicStats, type ListQuery, type PublicStats } from '@/features/listing/queries';
import { createPublicClient } from '@/lib/supabase/public';
import type { RailData } from './types';

/** Dải tin đi qua props xuống client: thẻ không dùng mô tả / địa chỉ, bỏ cho nhẹ HTML. */
const forRail = (items: PublicListing[]) => items.map((l) => ({ ...l, description: null, address_text: null }));

async function getCachedBanners(placement: BannerPlacement, locale: Locale): Promise<Banner[]> {
  'use cache';
  cacheLife({ revalidate: 300 });
  cacheTag('banners');
  const res = await listBanners(createPublicClient(), { placement, locale });
  if (res.error) throw new Error(res.error.code);
  return res.data;
}

/** Banner đang hiệu lực của một vị trí (`web_home`, `web_pass`…) theo ngôn ngữ (RLS lọc khung giờ). null = lỗi. */
export async function getBanners(placement: BannerPlacement, locale: Locale): Promise<Banner[] | null> {
  try {
    return await getCachedBanners(placement, locale);
  } catch {
    return null;
  }
}

/** Banner `web_home` của trang chủ. null = lỗi. */
export function getHomeBanners(locale: Locale): Promise<Banner[] | null> {
  return getBanners('web_home', locale);
}

/**
 * Một dải tin từ trang đầu danh sách (không từ khoá — dùng chung cache 300s với trang danh sách cùng bộ lọc, vd dải "Cho
 * tặng" = /pass-do?free=1), cắt còn `size` tin. null = lỗi.
 */
export async function getListRail(q: Omit<ListQuery, 'query'>, size: number): Promise<RailData | null> {
  try {
    const { page, now } = await getListPage({ ...q, query: '' });
    return { items: forRail(page.items.slice(0, size)), now };
  } catch {
    return null;
  }
}

/** Dải "Pass đồ / Tìm trọ / …": 8 tin mới nhất (dùng chung cache trang đầu của /pass-do…). null = lỗi. */
export function getFeatureRail(feature: ListingFeature): Promise<RailData | null> {
  return getListRail({ categories: LISTING_FEATURES[feature], site: null }, HOME_RAIL_SIZE.feature);
}

/** Dải "Gần {khu}" của khu mặc định (render sẵn cho khách / bot; trình duyệt đổi khu nếu người dùng đã chọn khu khác). */
export function getNearRail(site: string): Promise<RailData | null> {
  return getListRail({ categories: LISTING_CATEGORIES, site }, HOME_RAIL_SIZE.near);
}

/** Số liệu cộng đồng (RPC public_stats, cache 1 giờ). null = lỗi. */
export async function getHomeStats(): Promise<PublicStats | null> {
  try {
    return await getPublicStats();
  } catch {
    return null;
  }
}
