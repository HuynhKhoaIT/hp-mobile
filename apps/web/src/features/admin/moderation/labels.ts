// Quy tắc hiển thị hàng chờ (thuần, dùng ở server lẫn client): tone badge lý do / rủi ro, link giữ bộ lọc trên URL.
import { type ModerationReason, type ModerationStatus, riskLevel } from '@hp/shared';
import type { ModerationOwner } from '@hp/core';
import type { BadgeTone } from '@/components/shared/badge';

/** Lý do nặng (từ khoá cấm) đỏ; cần soi kỹ vàng; thông tin bối cảnh xanh. Luôn kèm chữ. */
export const REASON_TONE: Record<ModerationReason, BadgeTone> = {
  keyword_reject: 'danger',
  keyword: 'warning',
  report: 'warning',
  image_dup: 'warning',
  low_price: 'warning',
  new_account: 'primary',
  resubmit: 'primary',
};

export const RISK_TONE: Record<ReturnType<typeof riskLevel>, BadgeTone> = { high: 'danger', medium: 'warning', low: 'neutral' };

export type QueueLinkParams = { status: ModerationStatus; reason?: ModerationReason | null; page?: number; item?: string | null };

/** Href next-intl cho /admin/moderation, bỏ giá trị mặc định khỏi query (URL gọn, chia sẻ được). */
export function queueHref({ status, reason, page, item }: QueueLinkParams) {
  const query: Record<string, string> = {};
  if (status !== 'pending') query.status = status;
  if (reason) query.reason = reason;
  if (page && page > 1) query.page = String(page);
  if (item) query.item = item;
  return { pathname: '/admin/moderation' as const, query };
}

/** Chủ tin đang bị cấm hoặc khoá tạm (banned_until còn hạn). */
export function isOwnerBanned(owner: Pick<ModerationOwner, 'is_banned' | 'banned_until'>, now: number): boolean {
  return owner.is_banned || (owner.banned_until !== null && new Date(owner.banned_until).getTime() > now);
}
