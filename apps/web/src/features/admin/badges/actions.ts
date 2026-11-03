'use server';

// Server Action huy hiệu (moderator+). Duyệt / từ chối = update badge_requests qua RLS; trigger DB thêm huy hiệu vào hồ sơ,
// ghi audit `badge.approve|reject` và thông báo `system` cho người xin (không ghi đôi ở đây).
// Xem giấy tờ: ký signed URL 5 phút bằng phiên staff (policy verification_select_own_or_staff), không service role.
import { getBadgeDocumentUrl, reviewBadgeRequest } from '@hp/core';
import type { ActionResult } from '@/lib/action-result';
import { asRecord, refreshAdmin, withStaff } from '../lib/server';

export async function reviewBadgeAction(raw: unknown): Promise<ActionResult<{ id: string; user_id: string; badge: string }>> {
  const v = asRecord(raw);
  const result = await withStaff('moderator', (s) =>
    reviewBadgeRequest(s.supabase, { id: v.id, approve: v.approve, rejectReason: v.rejectReason }),
  );
  if (result.ok) refreshAdmin();
  return result;
}

export async function getBadgeDocumentAction(raw: unknown): Promise<ActionResult<{ url: string; kind: 'image' | 'pdf' }>> {
  const v = asRecord(raw);
  return withStaff('moderator', (s) => getBadgeDocumentUrl(s.supabase, v.id));
}
