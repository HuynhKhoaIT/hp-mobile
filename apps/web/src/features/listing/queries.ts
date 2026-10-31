// Đọc tin phía server cho trang công khai (/tin, /pass-do, /tro, /viec-lam, /that-lac, /tin/[slug]).
// Chỉ gọi @hp/core với client ẩn danh (createPublicClient — không cookie) để cache được bằng 'use cache'
// (.claude/rules/web-routing-rsc.md): danh sách không từ khoá cache 300s, chi tiết 300s + tag `listing:{id}`.
// Có từ khoá tìm kiếm → không cache (gọi theo request, nằm trong <Suspense> của trang).
// - Lỗi (mạng, DB) được NÉM ra bên trong hàm cache để không bị cache 300s; trang hiện error.tsx (nút thử lại).
//   "Không tìm thấy" là kết quả bình thường (trả null → notFound()), được cache.
// - Hàm cache trả kèm `now` (thời điểm đọc) để tính "x phút trước": Cache Components không cho new Date() khi prerender.
import 'server-only';
import {
  getListingBySlug,
  listSites,
  type Page,
  type PublicListing,
  type Result,
  searchListings,
  similarListings,
  type Site,
} from '@hp/core';
import type { ListingCategory } from '@hp/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

/** Số tin mỗi trang: chia hết cho lưới 2 / 3 / 4 cột. */
export const LIST_PAGE_SIZE = 24;

export type Timed<T> = T & { now: number };

export type ListQuery = { categories: readonly ListingCategory[]; site: string | null; query: string };

/** Lỗi đọc dữ liệu: message = mã errors.* (error.tsx không hiện message ở production, chỉ để log). */
function unwrap<T>(result: Result<T>): T {
  if (result.error) throw new Error(result.error.code);
  return result.data;
}

async function fetchListPage(q: ListQuery): Promise<Page<PublicListing>> {
  return unwrap(
    await searchListings(createPublicClient(), {
      categories: [...q.categories],
      site: q.site ?? undefined,
      query: q.query || undefined,
      limit: LIST_PAGE_SIZE,
    }),
  );
}

/** Trang đầu theo danh mục / khu (không từ khoá): tập tham số hữu hạn → cache 300s. */
async function getCachedListPage(categories: readonly ListingCategory[], site: string | null) {
  'use cache';
  cacheLife({ revalidate: 300 });
  cacheTag('listings');
  const page = await fetchListPage({ categories, site, query: '' });
  return { page, now: Date.now() };
}

/** Trang đầu của danh sách. Có từ khoá → đọc theo request (không cache); chỉ gọi sau khi đã đọc searchParams. */
export async function getListPage(q: ListQuery): Promise<Timed<{ page: Page<PublicListing> }>> {
  if (!q.query) return getCachedListPage(q.categories, q.site);
  const page = await fetchListPage(q);
  return { page, now: Date.now() };
}

/**
 * Chi tiết theo slug `{tieu-de}-{short_id}` (RPC so short_id cuối slug; trả slug chuẩn để trang redirect 301).
 * Tag `listing:{id}` để /api/revalidate (tuần 4) làm mới khi chủ tin sửa / đổi trạng thái. null = không có / không còn active.
 */
export async function getListingPage(slug: string): Promise<Timed<{ listing: PublicListing | null }>> {
  'use cache';
  cacheLife({ revalidate: 300 });
  cacheTag('listings');
  const result = await getListingBySlug(createPublicClient(), slug);
  if (result.error && result.error.code !== 'not_found') throw new Error(result.error.code);
  if (result.data) cacheTag(`listing:${result.data.id}`);
  return { listing: result.data, now: Date.now() };
}

async function getCachedSimilar(listingId: string) {
  'use cache';
  cacheLife({ revalidate: 300 });
  cacheTag('listings', `listing:${listingId}`);
  return unwrap(await similarListings(createPublicClient(), listingId, 4));
}

/** Tin tương tự (cùng category, ưu tiên cùng khu). Khối phụ: lỗi → danh sách rỗng, không làm hỏng trang chi tiết. */
export async function getSimilarListings(listingId: string): Promise<PublicListing[]> {
  try {
    return await getCachedSimilar(listingId);
  } catch {
    return [];
  }
}

async function getCachedSites() {
  'use cache';
  cacheLife('hours');
  cacheTag('sites');
  return unwrap(await listSites(createPublicClient()));
}

/** Danh mục khu (bộ lọc khu, H1 "… gần {khu}"). Admin ít khi đổi → cache theo giờ. Lỗi → rỗng (ẩn bộ lọc khu). */
export async function getPublicSites(): Promise<Site[]> {
  try {
    return await getCachedSites();
  } catch {
    return [];
  }
}

/**
 * Slug tin mới nhất để prerender lúc build (generateStaticParams của /tin/[slug]). Cache Components bắt buộc trả ít nhất
 * một giá trị; DB không truy cập được lúc build → slug giữ chỗ (trang đó render not-found, vẫn hợp lệ).
 */
export async function getPrerenderSlugs(limit = 20): Promise<string[]> {
  const res = await searchListings(createPublicClient(), { limit });
  const slugs = res.data?.items.map((l) => l.slug) ?? [];
  return slugs.length > 0 ? slugs : ['tin-000000'];
}
