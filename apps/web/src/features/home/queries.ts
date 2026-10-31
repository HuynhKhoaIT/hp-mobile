// Đọc phía server cho trang chủ (Hub) — phần CÔNG KHAI, giống nhau với mọi người (docs/design/home.md §5):
// banner, dải theo dịch vụ, dải "Gần {khu}" của khu mặc định, số liệu cộng đồng. Client ẩn danh + 'use cache' (300s,
// tag `banners` / `listings`) → trang chủ prerender tĩnh, không đọc cookie. Phần theo người dùng đọc ở trình duyệt.
// Lỗi: trả null (không cache lỗi) → component client của khối đó tự tải lại ở trình duyệt / hiện lỗi + Thử lại; một khối
// lỗi không làm hỏng cả trang.
import 'server-only';
import { type Banner, listBanners } from '@hp/core';
import { HOME_RAIL_SIZE, LISTING_CATEGORIES, LISTING_FEATURES, type ListingFeature, type Locale } from '@hp/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { getListPage, getPublicStats, type PublicStats } from '@/features/listing/queries';
import { createPublicClient } from '@/lib/supabase/public';
import type { RailData } from './types';

async function getCachedBanners(locale: Locale): Promise<Banner[]> {
  'use cache';
  cacheLife({ revalidate: 300 });
  cacheTag('banners');
  const res = await listBanners(createPublicClient(), { placement: 'web_home', locale });
  if (res.error) throw new Error(res.error.code);
  return res.data;
}

/** Banner `web_home` đang hiệu lực theo ngôn ngữ (RLS lọc khung giờ). null = lỗi. */
export async function getHomeBanners(locale: Locale): Promise<Banner[] | null> {
  try {
    return await getCachedBanners(locale);
  } catch {
    return null;
  }
}

/** Dải "Pass đồ / Tìm trọ / …": 8 tin mới nhất (dùng chung cache trang đầu của /pass-do…). null = lỗi. */
export async function getFeatureRail(feature: ListingFeature): Promise<RailData | null> {
  try {
    const { page, now } = await getListPage({ categories: LISTING_FEATURES[feature], site: null, query: '' });
    return { items: page.items.slice(0, HOME_RAIL_SIZE.feature), now };
  } catch {
    return null;
  }
}

/** Dải "Gần {khu}" của khu mặc định (render sẵn cho khách / bot; trình duyệt đổi khu nếu người dùng đã chọn khu khác). */
export async function getNearRail(site: string): Promise<RailData | null> {
  try {
    const { page, now } = await getListPage({ categories: LISTING_CATEGORIES, site, query: '' });
    return { items: page.items.slice(0, HOME_RAIL_SIZE.near), now };
  } catch {
    return null;
  }
}

/** Số liệu cộng đồng (RPC public_stats, cache 1 giờ). null = lỗi. */
export async function getHomeStats(): Promise<PublicStats | null> {
  try {
    return await getPublicStats();
  } catch {
    return null;
  }
}
