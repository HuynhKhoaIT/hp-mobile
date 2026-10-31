'use server';

// Server Action kiểm duyệt (.claude/rules/web-admin.md): Zod (@hp/shared) → requireStaff() kiểm LẠI ở server (phiên aal2 +
// vai trò trong profiles) → @hp/core (RPC review_listing: RLS / is_staff() là chốt cuối) → làm mới cache → ActionResult.
// audit_log + notifications do RPC review_listing ghi trong cùng transaction với đổi trạng thái (một logic một tầng —
// không ghi lại ở đây để tránh audit / thông báo đôi; audit_log `listing.approve` / `listing.reject`, meta.note = lý do).
// Làm mới: updateTag `listing:{id}` + `listings` (trang tin công khai, danh sách, sitemap — tin vừa duyệt hiện ngay) và
// revalidatePath layout /admin (badge chờ duyệt ở thanh bên + trang hàng chờ, client tự làm mới trong cùng lượt).
import {
  approveListings,
  type BulkReviewResult,
  flattenIssues,
  getModerationItem,
  type ModerationDetail,
  reviewListing,
} from '@hp/core';
import { BulkApproveInput, ModerationItemInput, ReviewListingInput } from '@hp/shared';
import { revalidatePath, updateTag } from 'next/cache';
import { type ActionResult, err, fromResult } from '@/lib/action-result';
import { requireStaff } from '../session';

function invalid<T>(issues: { path: PropertyKey[]; message: string }[]): ActionResult<T> {
  const first = issues[0]?.message;
  return err(first && /^[a-z_]+$/.test(first) ? first : 'invalid_input', flattenIssues(issues));
}

function refresh(listingIds: string[]) {
  for (const id of listingIds) updateTag(`listing:${id}`);
  if (listingIds.length) updateTag('listings');
  revalidatePath('/[locale]/admin', 'layout');
}

/** Duyệt / từ chối một tin. Từ chối bắt buộc có lý do mẫu (admin.reasons.*), ghi chú tự do không bắt buộc. */
export async function reviewListingAction(raw: unknown): Promise<ActionResult<null>> {
  const parsed = ReviewListingInput.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error.issues);
  const check = await requireStaff('moderator');
  if (!check.ok) return err(check.code);
  const result = await reviewListing(check.staff.supabase, parsed.data);
  if (!result.error) refresh([parsed.data.listingId]);
  return fromResult(result);
}

/** Duyệt hàng loạt (≤ 50 tin của trang đang xem). Trả danh sách đã duyệt / lỗi theo tin để client hoàn tác đúng dòng. */
export async function approveListingsAction(raw: unknown): Promise<ActionResult<BulkReviewResult>> {
  const parsed = BulkApproveInput.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error.issues);
  const check = await requireStaff('moderator');
  if (!check.ok) return err(check.code);
  const result = await approveListings(check.staff.supabase, parsed.data);
  if (!result.error) refresh(result.data.approved);
  return fromResult(result);
}

/** Chi tiết + lịch sử kiểm duyệt + số tin của chủ tin (panel bên phải). Chỉ đọc, không làm mới cache. */
export async function getModerationItemAction(raw: unknown): Promise<ActionResult<ModerationDetail>> {
  const parsed = ModerationItemInput.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error.issues);
  const check = await requireStaff('moderator');
  if (!check.ok) return err(check.code);
  return fromResult(await getModerationItem(check.staff.supabase, parsed.data.id));
}
