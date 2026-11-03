'use server';

// Server Action báo cáo (moderator+). audit_log do DB ghi: trigger trg_reports_audit (`report.update` mỗi dòng),
// RPC staff_set_listing_status (`listing.status`), staff_cancel_group (`group.cancel`, thành viên nhận thông báo).
// "Ẩn tin / Huỷ nhóm rồi đóng báo cáo" là 2 bước độc lập, mỗi bước tự ghi audit; bước 2 lỗi → báo cáo còn mở, làm lại được.
import { resolveReportsForTarget, setReportsStatus, staffCancelGroup, staffSetListingStatus } from '@hp/core';
import { updateTag } from 'next/cache';
import type { ActionResult } from '@/lib/action-result';
import { asRecord, refreshAdmin, withStaff } from '../lib/server';

/** Đổi trạng thái 1..50 báo cáo (Đang xem / Đã xử lý / Bỏ qua). */
export async function setReportsStatusAction(raw: unknown): Promise<ActionResult<{ updated: string[] }>> {
  const v = asRecord(raw);
  const result = await withStaff('moderator', (s) => setReportsStatus(s.supabase, { ids: v.ids, status: v.status }));
  if (result.ok) refreshAdmin();
  return result;
}

/** Ẩn tin bị báo cáo (closed, có ghi chú) rồi đóng mọi báo cáo đang mở của tin đó. */
export async function hideReportedListingAction(raw: unknown): Promise<ActionResult<{ updated: string[] }>> {
  const v = asRecord(raw);
  const result = await withStaff('moderator', async (s) => {
    const hidden = await staffSetListingStatus(s.supabase, { listingId: v.listingId, status: 'closed', note: v.note });
    if (hidden.error) return hidden;
    return resolveReportsForTarget(s.supabase, { targetType: 'listing', targetId: v.listingId });
  });
  if (result.ok && typeof v.listingId === 'string') {
    updateTag(`listing:${v.listingId}`);
    updateTag('listings');
  }
  if (result.ok) refreshAdmin();
  return result;
}

/** Huỷ nhóm bị báo cáo (có ghi chú, thành viên nhận thông báo) rồi đóng báo cáo của nhóm. */
export async function cancelReportedGroupAction(raw: unknown): Promise<ActionResult<{ updated: string[] }>> {
  const v = asRecord(raw);
  const result = await withStaff('moderator', async (s) => {
    const cancelled = await staffCancelGroup(s.supabase, { groupId: v.groupId, note: v.note });
    // Nhóm đã kết thúc / huỷ từ trước: vẫn cho đóng báo cáo.
    if (cancelled.error && cancelled.error.code !== 'group_closed') return cancelled;
    return resolveReportsForTarget(s.supabase, { targetType: 'group', targetId: v.groupId });
  });
  if (result.ok && typeof v.groupId === 'string') {
    updateTag(`group:${v.groupId}`);
    updateTag('groups');
  }
  if (result.ok) refreshAdmin();
  return result;
}
