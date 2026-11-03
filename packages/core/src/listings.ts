// Tin đăng — phần đọc công khai (migration 20261031120000_public_listings). Ghi (đăng / sửa / đánh dấu đã bán) ở tuần 4.
// Người khác và khách chỉ đọc view public_listings / RPC công khai (đã che PII), không from('listings').
import type { Database } from '@hp/db';
import { ListingFilters, type ListingCategory } from '@hp/shared';
import { type Client, type Result, fail, fromSupabase, ok } from './result';
import type { Page } from './social';

type PublicListingRow = Database['public']['Views']['public_listings']['Row'];

/** Một tin công khai (card + chi tiết). Không có search_vector — cột đó chỉ để RPC dùng index. */
export type PublicListing = Omit<PublicListingRow, 'search_vector'>;

/** Cột client đọc từ public_listings / RPC. Thêm cột vào view → thêm ở đây. Một chuỗi literal để supabase-js suy ra type. */
// prettier-ignore
export const LISTING_COLUMNS = 'id,slug,short_id,category,status,title,description,price,price_type,attributes,site,site_name,lat,lng,distance_to_site_m,address_text,images,lang,view_count,expires_at,created_at,updated_at,owner_id,owner_name,owner_avatar_url,owner_badges,owner_rating_avg,owner_rating_count,owner_since,is_expired,inactive_since';

export type ListingQuery = ListingFilters & { cursor?: string | null; limit?: number };

const toPage = (items: PublicListing[], limit: number): Page<PublicListing> => ({
  items,
  nextCursor: items.length === limit ? (items.at(-1)?.created_at ?? null) : null,
});

/** List / tìm kiếm / lọc. Phân trang cursor (created_at của tin cuối), tối đa 50 / trang. */
export async function searchListings(client: Client, query: ListingQuery = {}): Promise<Result<Page<PublicListing>>> {
  const { cursor, limit: rawLimit, ...rest } = query;
  const parsed = ListingFilters.safeParse(rest);
  if (!parsed.success) return fail('invalid_input');
  const f = parsed.data;
  const limit = Math.min(Math.max(rawLimit ?? 20, 1), 50);

  const res = await client
    .rpc('search_listings', {
      p_categories: f.categories?.length ? f.categories : undefined,
      p_query: f.query || undefined,
      p_site: f.site,
      p_lat: f.lat,
      p_lng: f.lng,
      p_radius_m: f.radiusM,
      p_price_min: f.priceMin,
      p_price_max: f.priceMax,
      p_attributes: f.attributes,
      p_limit: limit,
      p_cursor: cursor ?? undefined,
      p_max_distance_m: f.maxDistanceM,
    })
    .select(LISTING_COLUMNS);
  const result = fromSupabase<PublicListing[]>(res);
  if (result.error) return result;
  return ok(toPage(result.data ?? [], limit));
}

/** Chi tiết theo slug `{tieu-de}-{short_id}` (link chia sẻ). Không thấy / không còn active → not_found. */
export async function getListingBySlug(client: Client, slug: string): Promise<Result<PublicListing>> {
  const res = await client.rpc('get_listing_by_slug', { p_slug: slug }).select(LISTING_COLUMNS).maybeSingle();
  return fromSupabase<PublicListing>(res, true);
}

/** Chi tiết theo id (điều hướng nội bộ app). */
export async function getListing(client: Client, id: string): Promise<Result<PublicListing>> {
  const res = await client.from('public_listings').select(LISTING_COLUMNS).eq('id', id).maybeSingle();
  return fromSupabase<PublicListing>(res, true);
}

/** Tin tương tự cho trang chi tiết (cùng category, ưu tiên cùng khu). */
export async function similarListings(client: Client, listingId: string, limit = 6): Promise<Result<PublicListing[]>> {
  const res = await client.rpc('similar_listings', { p_listing_id: listingId, p_limit: limit }).select(LISTING_COLUMNS);
  const result = fromSupabase<PublicListing[]>(res);
  return result.error ? result : ok(result.data ?? []);
}

/** Đếm lượt xem (chỉ khi đăng nhập; khách bỏ qua). Lỗi không ảnh hưởng màn hình nên nuốt lỗi quyền. */
export async function recordListingView(client: Client, listingId: string): Promise<Result<null>> {
  const { data } = await client.auth.getSession();
  if (!data.session) return ok(null);
  const res = await client.rpc('record_listing_view', { p_listing_id: listingId });
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}

/** Ghi từ khoá tìm kiếm (gợi ý từ khoá hot). Gọi sau khi tìm có từ khoá, không chờ kết quả. */
export async function logSearch(
  client: Client,
  v: { query: string; category?: ListingCategory; results: number },
): Promise<Result<null>> {
  const query = v.query.trim();
  if (!query) return ok(null);
  const res = await client.rpc('log_search', { p_query: query.slice(0, 100), p_category: v.category, p_results: v.results });
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}

/** Ảnh bìa (path trong bucket listing-images) hoặc null. Dựng URL bằng imageUrl(supabaseUrl, 'listing-images', path). */
export function listingCover(listing: Pick<PublicListing, 'images'>): string | null {
  return listing.images[0] ?? null;
}

// ── Vòng đời (trang chi tiết tin đã bán / đóng / hết hạn) ──────────────────────────
export type ListingDisplayStatus = 'active' | 'sold' | 'closed' | 'expired';

/** Trạng thái để hiện nhãn: active quá expires_at (cron chưa kịp đổi) coi là expired. */
export function listingDisplayStatus(l: Pick<PublicListing, 'status' | 'is_expired'>): ListingDisplayStatus {
  if (l.status === 'active') return l.is_expired ? 'expired' : 'active';
  return l.status === 'sold' || l.status === 'closed' ? l.status : 'expired';
}

/** Tin thôi hiện quá 30 ngày → web trả 410 (.claude/rules/web-seo-public.md). */
export function isListingGone(l: Pick<PublicListing, 'inactive_since'>, now: Date = new Date()): boolean {
  if (!l.inactive_since) return false;
  return now.getTime() - new Date(l.inactive_since).getTime() > 30 * 24 * 60 * 60 * 1000;
}

// ── Tin đã lưu (bookmarks target_type = listing) ───────────────────────────────────
/** Tin đã lưu còn công khai, mới lưu trước. Tin đã gỡ / bị chặn tự biến mất (view lọc). */
export async function listSavedListings(client: Client): Promise<Result<PublicListing[]>> {
  const marks = fromSupabase(
    await client.from('bookmarks').select('target_id, created_at').eq('target_type', 'listing').order('created_at', { ascending: false }).limit(200),
  );
  if (marks.error) return marks;
  const ids = (marks.data ?? []).map((m) => m.target_id);
  if (ids.length === 0) return ok([]);
  const res = fromSupabase<PublicListing[]>(await client.from('public_listings').select(LISTING_COLUMNS).in('id', ids));
  if (res.error) return res;
  const byId = new Map((res.data ?? []).map((l) => [l.id, l]));
  return ok(ids.flatMap((id) => byId.get(id) ?? []));
}

/** Tin đang hiện của một người (trang hồ sơ công khai). view public_listings đã ẩn tin của người chặn mình. */
export async function listListingsByOwner(
  client: Client,
  v: { ownerId: string; cursor?: string | null; limit?: number },
): Promise<Result<Page<PublicListing>>> {
  const limit = Math.min(Math.max(v.limit ?? 20, 1), 50);
  let q = client
    .from('public_listings')
    .select(LISTING_COLUMNS)
    .eq('owner_id', v.ownerId)
    .eq('status', 'active')
    .eq('is_expired', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (v.cursor) q = q.lt('created_at', v.cursor);
  const res = fromSupabase<PublicListing[]>(await q);
  return res.error ? res : ok(toPage(res.data ?? [], limit));
}

/** "Gợi ý cho bạn" ở Hub (RPC home_feed): cùng khu → danh mục hay xem → mới nhất, 30 ngày, không gồm tin của mình. */
export async function getHomeFeed(client: Client, opts: { site?: string | null; limit?: number } = {}): Promise<Result<PublicListing[]>> {
  const res = await client
    .rpc('home_feed', { p_site: opts.site ?? undefined, p_limit: Math.min(Math.max(opts.limit ?? 20, 1), 50) })
    .select(LISTING_COLUMNS);
  const result = fromSupabase<PublicListing[]>(res);
  return result.error ? result : ok(result.data ?? []);
}

/** Tin mất / nhặt khớp với một tin của mình (trigger khớp tự động — LOST_FOUND_MATCH ở @hp/shared). */
export async function listLostFoundMatches(client: Client, listingId: string): Promise<Result<PublicListing[]>> {
  const res = await client.rpc('list_lost_found_matches', { p_listing_id: listingId }).select(LISTING_COLUMNS);
  const result = fromSupabase<PublicListing[]>(res);
  return result.error ? result : ok(result.data ?? []);
}

/** Chủ tin thất lạc: "Đã nhận lại đồ" — attributes.returned = true + đóng tin trong một lệnh (RPC mark_listing_returned). */
export async function markListingReturned(client: Client, listingId: string): Promise<Result<null>> {
  const res = await client.rpc('mark_listing_returned', { p_listing_id: listingId });
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}
