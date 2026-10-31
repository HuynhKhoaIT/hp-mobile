'use server';

// Ghi tin từ web (.claude/rules/web-server-actions.md): mỗi action theo thứ tự Zod (@hp/shared) → đăng nhập → @hp/core
// (RLS + trigger DB quyết định quyền, kiểm duyệt, giới hạn 10 tin / ngày) → làm mới cache → ActionResult.
// - Ảnh KHÔNG đi qua action: trình duyệt nén + upload thẳng Storage (uploadListingImage), action chỉ nhận path.
// - Làm mới: updateTag (đọc lại ngay dữ liệu vừa ghi — read-your-own-writes) cho `listing:{id}` và `listings`
//   (danh sách, sitemap, chi tiết). Webhook DB → /api/revalidate làm điều tương tự cho thay đổi từ app / admin / cron.
// - Trang /toi/* đọc theo request (không cache) → client gọi router.refresh() sau khi action xong.
// - Input nhỏ (id, trạng thái, bookmark) chưa có schema ở @hp/shared → kiểm tối thiểu ở đây (uuid, enum); lỗi dữ liệu thật
//   vẫn do DB trả (invalid_input / forbidden).
import {
  createListing,
  deleteListing,
  flattenIssues,
  renewListing,
  revealContact,
  type SavedListingResult,
  setBookmark,
  setListingStatus,
  updateListing,
} from '@hp/core';
import { CreateListingInput, OWNER_LISTING_STATUSES, type OwnerListingStatus, UpdateListingInput } from '@hp/shared';
import { updateTag } from 'next/cache';
import { type ActionResult, err, fromResult } from '@/lib/action-result';
import { createServerClient } from '@/lib/supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

/** Client Supabase theo cookie + kiểm đăng nhập (JWT đã kiểm chữ ký). null = khách. */
async function signedInClient() {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ? supabase : null;
}

function invalidate(listingId: string) {
  updateTag(`listing:${listingId}`);
  updateTag('listings');
}

/** Zod lỗi → `invalid_input` (hoặc mã nghiệp vụ của issue đầu như too_short) + lỗi theo ô. */
function invalid<T>(issues: { path: PropertyKey[]; message: string }[]): ActionResult<T> {
  const first = issues[0]?.message;
  return err(first && /^[a-z_]+$/.test(first) ? first : 'invalid_input', flattenIssues(issues));
}

/** Đăng tin / lưu nháp. Trả status thật sau kiểm duyệt DB (active / pending_review / rejected / draft). */
export async function createListingAction(raw: unknown): Promise<ActionResult<SavedListingResult>> {
  const parsed = CreateListingInput.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error.issues);
  const supabase = await signedInClient();
  if (!supabase) return err('auth_required');
  const result = await createListing(supabase, parsed.data);
  if (!result.error) invalidate(result.data.id);
  return fromResult(result);
}

/** Sửa tin (chỉ trường gửi lên; category gửi kèm để kiểm attributes / giá). */
export async function updateListingAction(raw: unknown): Promise<ActionResult<SavedListingResult>> {
  const parsed = UpdateListingInput.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error.issues);
  const supabase = await signedInClient();
  if (!supabase) return err('auth_required');
  const result = await updateListing(supabase, parsed.data);
  if (!result.error) invalidate(result.data.id);
  return fromResult(result);
}

/** Đã bán / đóng / mở lại / về nháp. Mở lại tin chờ duyệt / bị từ chối / hết hạn → DB trả forbidden. */
export async function setListingStatusAction(raw: { id: string; status: OwnerListingStatus }): Promise<ActionResult<SavedListingResult>> {
  if (!isUuid(raw?.id) || !(OWNER_LISTING_STATUSES as readonly string[]).includes(raw?.status)) return err('invalid_input');
  const supabase = await signedInClient();
  if (!supabase) return err('auth_required');
  const result = await setListingStatus(supabase, { id: raw.id, status: raw.status });
  if (!result.error) invalidate(raw.id);
  return fromResult(result);
}

/** Xoá mềm. */
export async function deleteListingAction(id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return err('invalid_input');
  const supabase = await signedInClient();
  if (!supabase) return err('auth_required');
  const result = await deleteListing(supabase, id);
  if (!result.error) invalidate(id);
  return fromResult(result);
}

/** Gia hạn (3 ngày cuối hoặc đã hết hạn). Trả expires_at mới. Lỗi: too_early, conflict, banned. */
export async function renewListingAction(id: string): Promise<ActionResult<string>> {
  if (!isUuid(id)) return err('invalid_input');
  const supabase = await signedInClient();
  if (!supabase) return err('auth_required');
  const result = await renewListing(supabase, id);
  if (!result.error) invalidate(id);
  return fromResult(result);
}

/** "Hiện số điện thoại": RPC reveal_contact (đăng nhập, 20 lần / giờ, ghi audit). Không cache, không revalidate. */
export async function revealContactAction(listingId: string): Promise<ActionResult<{ phone: string | null }>> {
  if (!isUuid(listingId)) return err('invalid_input');
  const supabase = await signedInClient();
  if (!supabase) return err('auth_required');
  return fromResult(await revealContact(supabase, listingId));
}

/** Lưu / bỏ lưu tin. Dữ liệu riêng của người dùng → không làm mới cache công khai. */
export async function setBookmarkAction(raw: { listingId: string; next: boolean }): Promise<ActionResult<null>> {
  if (!isUuid(raw?.listingId) || typeof raw?.next !== 'boolean') return err('invalid_input');
  const supabase = await signedInClient();
  if (!supabase) return err('auth_required');
  return fromResult(await setBookmark(supabase, { targetType: 'listing', targetId: raw.listingId, next: raw.next }));
}
