// Tin đăng — phần ghi của chủ tin (migration 20261101090000_listing_write_moderation).
// CRUD qua PostgREST + RLS (bảng listings); kiểm duyệt / giới hạn 10 tin / ngày do trigger DB quyết định:
// đăng "active" có thể trả về pending_review / rejected — client đọc `status` trả về để hiện đúng màn kết quả.
// Luồng có ảnh: createListing(status 'draft') → uploadListingImage từng ảnh (cần listing id cho path)
//   → updateListing({ id, images, status: 'active' }). Thoát giữa chừng thì tin còn ở Nháp.
import type { Database, Json } from '@hp/db';
import { CreateListingInput, type OwnerListingStatus, UpdateListingInput } from '@hp/shared';
import { flattenIssues } from './profile';
import { type Client, type Result, fail, fromSupabase, ok, requireUserId } from './result';
import type { Page } from './social';

type ListingRow = Database['public']['Tables']['listings']['Row'];

/** Cột chủ tin đọc từ bảng gốc (không location: PostgREST trả WKB; không search_vector). */
// prettier-ignore
export const MY_LISTING_COLUMNS = 'id,slug,short_id,category,status,title,description,price,price_type,attributes,site,address_text,images,lang,view_count,expires_at,created_at,updated_at,moderation_reasons';

export type MyListing = Pick<
  ListingRow,
  | 'id' | 'slug' | 'short_id' | 'category' | 'status' | 'title' | 'description' | 'price' | 'price_type' | 'attributes'
  | 'site' | 'address_text' | 'images' | 'lang' | 'view_count' | 'expires_at' | 'created_at' | 'updated_at'
  | 'moderation_reasons'
>;

/** Nhóm tab "Tin của tôi". */
export type MyListingsTab = 'active' | 'pending' | 'draft' | 'closed';
const TAB_STATUSES: Record<MyListingsTab, ListingRow['status'][]> = {
  active: ['active'],
  pending: ['pending_review', 'rejected'],
  draft: ['draft'],
  closed: ['sold', 'closed', 'expired'],
};

/** lat / lng → EWKT cho cột geography (PostgREST nhận chuỗi). */
function toPoint(lat: number | null | undefined, lng: number | null | undefined): string | null | undefined {
  if (lat === undefined && lng === undefined) return undefined;
  if (lat == null || lng == null) return null;
  return `SRID=4326;POINT(${lng} ${lat})`;
}

function invalid<T>(issues: { path: PropertyKey[]; message: string }[]): Result<T> {
  const fieldErrors = flattenIssues(issues);
  const first = issues[0];
  return fail<T>(first && /^[a-z_]+$/.test(first.message) ? first.message : 'invalid_input', 'invalid_input', fieldErrors);
}

export type SavedListingResult = Pick<MyListing, 'id' | 'slug' | 'status' | 'moderation_reasons'>;

/** Đăng tin. Trả status thật sau kiểm duyệt (active / pending_review / rejected / draft). */
export async function createListing(client: Client, input: unknown): Promise<Result<SavedListingResult>> {
  const parsed = CreateListingInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const uid = await requireUserId(client);
  if (uid.error) return uid;
  const { lat, lng, ...v } = parsed.data;
  return fromSupabase<SavedListingResult>(
    await client
      .from('listings')
      .insert({ ...v, attributes: v.attributes as NonNullable<Json>, owner_id: uid.data, location: toPoint(lat, lng) ?? null })
      .select('id,slug,status,moderation_reasons')
      .single(),
  );
}

/** Sửa tin (chỉ trường gửi lên). Sửa tiêu đề / mô tả tin active → DB kiểm duyệt lại. */
export async function updateListing(client: Client, input: unknown): Promise<Result<SavedListingResult>> {
  const parsed = UpdateListingInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const { id, category: _category, lat, lng, attributes, ...v } = parsed.data;
  const location = toPoint(lat, lng);
  const patch = {
    ...v,
    ...(attributes === undefined ? {} : { attributes: attributes as NonNullable<Json> }),
    ...(location === undefined ? {} : { location }),
  };
  return fromSupabase<SavedListingResult>(
    await client.from('listings').update(patch).eq('id', id).select('id,slug,status,moderation_reasons').maybeSingle(),
    true,
  );
}

/** Đánh dấu đã bán / đóng / mở lại / về nháp. Mở lại tin chờ duyệt / bị từ chối / hết hạn → DB từ chối (forbidden). */
export async function setListingStatus(
  client: Client,
  v: { id: string; status: OwnerListingStatus },
): Promise<Result<SavedListingResult>> {
  return fromSupabase<SavedListingResult>(
    await client.from('listings').update({ status: v.status }).eq('id', v.id).select('id,slug,status,moderation_reasons').maybeSingle(),
    true,
  );
}

/** Xoá mềm (ẩn ngay khỏi mọi nơi; dữ liệu giữ cho kiểm duyệt, xoá cứng theo chính sách). */
export async function deleteListing(client: Client, id: string): Promise<Result<null>> {
  const res = await client.from('listings').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id').maybeSingle();
  const r = fromSupabase(res, true);
  return r.error ? r : ok(null);
}

/** Gia hạn (3 ngày cuối hoặc đã hết hạn). Trả expires_at mới. Lỗi: too_early, not_found, conflict, banned. */
export async function renewListing(client: Client, id: string): Promise<Result<string>> {
  return fromSupabase<string>(await client.rpc('renew_listing', { p_listing_id: id }));
}

/** SĐT người đăng (849…), null khi người đăng không có SĐT. Đăng nhập; 20 lần / giờ; ghi audit. */
export async function revealContact(client: Client, listingId: string): Promise<Result<{ phone: string | null }>> {
  const { data } = await client.auth.getSession();
  if (!data.session) return fail('auth_required');
  const res = fromSupabase<string | null>(await client.rpc('reveal_contact', { p_listing_id: listingId }));
  return res.error ? res : ok({ phone: res.data ?? null });
}

/** Tin của tôi theo tab, mới cập nhật trước. Cursor = updated_at của dòng cuối. */
export async function listMyListings(
  client: Client,
  opts: { tab: MyListingsTab; cursor?: string | null; limit?: number },
): Promise<Result<Page<MyListing>>> {
  const uid = await requireUserId(client);
  if (uid.error) return uid;
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  let q = client
    .from('listings')
    .select(MY_LISTING_COLUMNS)
    .eq('owner_id', uid.data)
    .is('deleted_at', null)
    .in('status', TAB_STATUSES[opts.tab])
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (opts.cursor) q = q.lt('updated_at', opts.cursor);
  const res = fromSupabase<MyListing[]>(await q);
  if (res.error) return res;
  const items = res.data ?? [];
  return ok({ items, nextCursor: items.length === limit ? (items.at(-1)?.updated_at ?? null) : null });
}

/** Một tin của tôi (màn sửa) — kèm lat / lng gần đúng không có: form dùng lại site / address_text. */
export async function getMyListing(client: Client, id: string): Promise<Result<MyListing>> {
  return fromSupabase<MyListing>(
    await client.from('listings').select(MY_LISTING_COLUMNS).eq('id', id).is('deleted_at', null).maybeSingle(),
    true,
  );
}

/**
 * Upload một ảnh tin (đã nén webp / jpeg ≤ 2 MB) vào `{userId}/{listingId}/{index}-{ts}.{ext}`. Trả path để ghi vào
 * listings.images. Tên mới mỗi lần (không ghi đè). Lỗi: file_too_large, forbidden (bị cấm / sai thư mục), upload_failed.
 */
export async function uploadListingImage(
  client: Client,
  v: { userId: string; listingId: string; index: number; body: ArrayBuffer | Blob; contentType: 'image/webp' | 'image/jpeg' },
): Promise<Result<string>> {
  const path = `${v.userId}/${v.listingId}/${v.index}-${Date.now()}.${v.contentType === 'image/webp' ? 'webp' : 'jpg'}`;
  const up = await client.storage.from('listing-images').upload(path, v.body, { contentType: v.contentType, upsert: false });
  if (up.error) {
    const status = String((up.error as { statusCode?: string | number }).statusCode ?? '');
    return fail(status === '413' ? 'file_too_large' : status === '403' ? 'forbidden' : 'upload_failed');
  }
  return ok(path);
}

/** Xoá ảnh đã upload nhưng bỏ khỏi tin (dọn Storage; lỗi bỏ qua được). */
export async function removeListingImages(client: Client, paths: string[]): Promise<Result<null>> {
  if (paths.length === 0) return ok(null);
  const res = await client.storage.from('listing-images').remove(paths);
  return res.error ? fail('upload_failed') : ok(null);
}
