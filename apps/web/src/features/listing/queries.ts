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
  getMyListing,
  getMyProfile,
  listMyListings,
  listSavedListings,
  listSites,
  logSearch,
  type MyListing,
  type MyListingsTab,
  type MyProfile,
  type Page,
  type PublicListing,
  type Result,
  searchListings,
  similarListings,
  type Site,
} from '@hp/core';
import type { Database } from '@hp/db';
import type { ListingCategory } from '@hp/shared';
import { cacheLife, cacheTag } from 'next/cache';
import type { AttributeFilter } from './filters';
import { createPublicClient } from '@/lib/supabase/public';
import { createServerClient } from '@/lib/supabase/server';

/** Số tin mỗi trang: chia hết cho lưới 2 / 3 / 4 cột. */
export const LIST_PAGE_SIZE = 24;

export type Timed<T> = T & { now: number };

export type ListQuery = {
  categories: readonly ListingCategory[];
  site: string | null;
  query: string;
  /** Lọc thuộc tính (chip "Tìm nhanh") — đã kiểm bằng parseListFilters. */
  attributes?: AttributeFilter;
};

const hasAttributes = (a: AttributeFilter | undefined): a is AttributeFilter => !!a && Object.keys(a).length > 0;

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
      attributes: hasAttributes(q.attributes) ? { ...q.attributes } : undefined,
      limit: LIST_PAGE_SIZE,
    }),
  );
}

/** Trang đầu theo danh mục / khu / thuộc tính (không từ khoá): tập tham số hữu hạn (whitelist) → cache 300s. */
async function getCachedListPage(categories: readonly ListingCategory[], site: string | null, attributes: AttributeFilter | undefined) {
  'use cache';
  cacheLife({ revalidate: 300 });
  cacheTag('listings');
  const page = await fetchListPage({ categories, site, query: '', attributes });
  return { page, now: Date.now() };
}

/** Trang đầu của danh sách. Có từ khoá → đọc theo request (không cache); chỉ gọi sau khi đã đọc searchParams. */
export async function getListPage(q: ListQuery): Promise<Timed<{ page: Page<PublicListing> }>> {
  if (!q.query) return getCachedListPage(q.categories, q.site, hasAttributes(q.attributes) ? q.attributes : undefined);
  const page = await fetchListPage(q);
  return { page, now: Date.now() };
}

/**
 * Chi tiết theo slug `{tieu-de}-{short_id}` (RPC so short_id cuối slug; trả slug chuẩn để trang redirect 301).
 * Tag `listing:{id}` để /api/revalidate (webhook DB) và Server Action làm mới khi chủ tin sửa / đổi trạng thái.
 * Trả cả tin đã bán / đóng / hết hạn (trang hiện nhãn, 410 sau 30 ngày). null = không có / đã gỡ / chờ duyệt / nháp.
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

/** Ghi từ khoá tìm kiếm (gợi ý từ khoá hot). Chạy sau khi trả trang (after()); lỗi bỏ qua — không ảnh hưởng kết quả. */
export async function logSearchTerm(query: string, results: number, category?: ListingCategory): Promise<void> {
  await logSearch(createPublicClient(), { query, results, category });
}

// ── SEO: sitemap + số liệu công khai ─────────────────────────────────────────────
export type PublicStats = Database['public']['Functions']['public_stats']['Returns'][number];
export type SitemapListing = Database['public']['Functions']['sitemap_listings']['Returns'][number];

/** Số liệu cộng đồng (người dùng / tin đang đăng / khu) — RPC public_stats (anon). Cache 1 giờ; lỗi ném (không cache lỗi). */
export async function getPublicStats(): Promise<PublicStats> {
  'use cache';
  cacheLife('hours');
  cacheTag('listings', 'stats');
  // Chưa có wrapper @hp/core (RPC chỉ web dùng): gọi rpc có type từ @hp/db.
  const { data, error } = await createPublicClient().rpc('public_stats');
  if (error) throw new Error(error.code ?? 'unknown');
  return data?.[0] ?? { users: 0, listings: 0, sites: 0 };
}

/** Số URL tin mỗi file sitemap (khớp RPC sitemap_listings). */
export const SITEMAP_PAGE_SIZE = 10_000;

/** Một trang sitemap tin (1 = mới nhất). Cache 1 giờ + tag `listings` (webhook làm mới khi tin đổi). */
export async function getSitemapListings(page: number): Promise<SitemapListing[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('listings');
  const { data, error } = await createPublicClient().rpc('sitemap_listings', { p_page: page });
  if (error) throw new Error(error.code ?? 'unknown');
  return data ?? [];
}

// ── Khu đăng nhập: theo request (cookie phiên), KHÔNG 'use cache' — gọi trong <Suspense> ─────────────────
/** Ngữ cảnh form đăng tin: hồ sơ (khu mặc định) + danh mục khu. */
export async function getPostFormContext(): Promise<Result<{ profile: MyProfile; sites: Site[] }>> {
  const supabase = await createServerClient();
  const [profile, sites] = await Promise.all([getMyProfile(supabase), listSites(supabase)]);
  if (profile.error) return profile;
  return { data: { profile: profile.data, sites: sites.data ?? [] }, error: null };
}

/** Số tin mỗi trang "Tin của tôi". */
export const MY_LISTINGS_PAGE_SIZE = 20;

/** Tin của tôi theo tab (trang /toi/tin-cua-toi) + thời điểm đọc (tính hết hạn / gia hạn — component phải thuần). */
export async function getMyListingsPage(tab: MyListingsTab): Promise<{ result: Result<Page<MyListing>>; now: number }> {
  const result = await listMyListings(await createServerClient(), { tab, limit: MY_LISTINGS_PAGE_SIZE });
  return { result, now: Date.now() };
}

/** Một tin của tôi để sửa (RLS: chỉ chủ tin đọc được bảng gốc). */
export async function getMyListingForEdit(id: string): Promise<Result<MyListing>> {
  return getMyListing(await createServerClient(), id);
}

/** Tin đã lưu (trang /toi/da-luu) + thời điểm đọc (thời gian tương đối trên thẻ). */
export async function getSavedListingsPage(): Promise<{ result: Result<PublicListing[]>; now: number }> {
  const result = await listSavedListings(await createServerClient());
  return { result, now: Date.now() };
}
