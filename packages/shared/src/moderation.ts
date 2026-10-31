// Kiểm duyệt tin (hàng chờ moderation_queue, RPC review_listing) — hằng số + quy ước ghi chú dùng chung web admin / core.
// Không import gì (test bằng node --test). Zod input của Server Action ở schemas/actions/moderation.ts.

/** Lý do tự động đưa tin vào hàng chờ (CHECK của moderation_queue.reasons). Chữ: `listing.manage.reason.*`. */
export const MODERATION_REASONS = [
  'keyword',
  'keyword_reject',
  'new_account',
  'low_price',
  'resubmit',
  'image_dup',
  'report',
] as const;
export type ModerationReason = (typeof MODERATION_REASONS)[number];

/** Trạng thái một dòng hàng chờ (CHECK của moderation_queue.status). */
export const MODERATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

/** Lý do mẫu khi moderator từ chối tin. Chữ: `admin.reasons.*`. Lưu vào moderation_queue.note qua p_note. */
export const REJECT_REASONS = [
  'scam',
  'prohibited',
  'wrong_category',
  'duplicate',
  'misleading_price',
  'contact_in_title',
  'other',
] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

/** Phân trang hàng chờ (searchParams `page`): mặc định 25, tối đa 50 / trang (luật RPC / admin). */
export const MODERATION_PAGE_SIZE = 25;
export const MODERATION_MAX_PAGE_SIZE = 50;
/** Ghi chú tự do của moderator (cột note ≤ 500 ký tự, chừa chỗ cho mã lý do). */
export const REVIEW_NOTE_MAX = 400;
/** Duyệt hàng loạt tối đa một trang. */
export const BULK_REVIEW_MAX = 50;

/**
 * Ghi chú lưu ở moderation_queue.note / audit_log.meta.note: `"<mã lý do>"` hoặc `"<mã lý do>: <ghi chú>"`.
 * Mã lý do giữ dạng mã (không dịch) để admin đọc được ở mọi ngôn ngữ và thống kê được.
 */
export function composeReviewNote(reason: RejectReason | null | undefined, note: string | null | undefined): string | null {
  const text = (note ?? '').trim();
  if (reason) return text ? `${reason}: ${text}` : reason;
  return text || null;
}

/** Ngược lại composeReviewNote. Ghi chú không theo quy ước (vd duyệt bằng SQL trước đây) → reason null, giữ nguyên chữ. */
export function parseReviewNote(note: string | null | undefined): { reason: RejectReason | null; text: string | null } {
  if (!note) return { reason: null, text: null };
  const match = /^([a-z_]+)(?::\s*([\s\S]*))?$/.exec(note.trim());
  const code = match?.[1];
  if (code && (REJECT_REASONS as readonly string[]).includes(code)) {
    const text = match?.[2]?.trim();
    return { reason: code as RejectReason, text: text ? text : null };
  }
  return { reason: null, text: note.trim() || null };
}

/** Mức rủi ro hiển thị theo risk_score (trigger: 10 điểm / lý do). */
export function riskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 30) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}
