// Trạng thái 4 huy hiệu xin được (REQUESTABLE_BADGES) của người dùng — dùng chung cho tóm tắt ở header (BadgeSummary) và
// thân trang (BadgeRequestView); cùng quy tắc với useBadgeStates của app: đã có (profiles.badges) > yêu cầu mới nhất (danh
// sách listMyBadgeRequests đã sắp mới nhất trước: chờ duyệt / bị từ chối + lý do + ngày gửi) > chưa xin.
import type { BadgeRequest } from '@hp/core';
import { type RequestableBadge, REQUESTABLE_BADGES } from '@hp/shared';

export type BadgeStatus = 'owned' | 'pending' | 'rejected' | 'none';
export type BadgeState = {
  badge: RequestableBadge;
  status: BadgeStatus;
  reason: string | null;
  /** Ngày gửi yêu cầu mới nhất (chờ duyệt / bị từ chối); null khi đã có hoặc chưa xin. */
  requestedAt: string | null;
};

/** Huy hiệu xin (lại) được: chưa xin hoặc bị từ chối. */
export const canRequestBadge = (status: BadgeStatus) => status === 'none' || status === 'rejected';

export function badgeStates(owned: readonly string[], requests: readonly BadgeRequest[]): BadgeState[] {
  return REQUESTABLE_BADGES.map((badge) => {
    if (owned.includes(badge)) return { badge, status: 'owned', reason: null, requestedAt: null };
    const latest = requests.find((r) => r.badge === badge);
    if (latest?.status === 'pending') return { badge, status: 'pending', reason: null, requestedAt: latest.created_at };
    if (latest?.status === 'rejected') {
      return { badge, status: 'rejected', reason: latest.reject_reason, requestedAt: latest.created_at };
    }
    return { badge, status: 'none', reason: null, requestedAt: null };
  });
}
