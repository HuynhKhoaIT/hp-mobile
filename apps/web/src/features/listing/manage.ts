// Quy tắc hiển thị "Tin của tôi" (thuần, không React): trạng thái hiện, thao tác được phép trong menu. Chỉ là UI —
// DB (trigger guard, renew_listing) mới quyết định; thao tác sai trả lỗi (forbidden / too_early) và hiện toast.
// Khớp app (hợp đồng tuần 4): Sửa · Đánh dấu đã bán (chỉ pass đồ / trọ) · Đóng tin · Mở lại (đã bán / đã đóng)
// · Gửi duyệt lại (bị từ chối → DB chuyển pending_review, lý do `resubmit`) · Gia hạn (≤ 3 ngày cuối hoặc đã hết hạn) · Xoá.
import type { MyListing } from '@hp/core';
import { featureOfCategory, type ListingStatus } from '@hp/shared';
import type { BadgeTone } from '@/components/shared/badge';

const DAY_MS = 24 * 60 * 60 * 1000;
export const RENEW_WINDOW_DAYS = 3;

export type ManageAction = 'edit' | 'sold' | 'close' | 'reopen' | 'resubmit' | 'renew' | 'delete';

/** active quá expires_at (cron chưa kịp đổi) coi như hết hạn. */
export function ownerStatus(l: Pick<MyListing, 'status' | 'expires_at'>, now: number): ListingStatus {
  if (l.status === 'active' && l.expires_at && new Date(l.expires_at).getTime() <= now) return 'expired';
  return l.status as ListingStatus;
}

export function canRenew(l: Pick<MyListing, 'status' | 'expires_at'>, now: number): boolean {
  const status = ownerStatus(l, now);
  if (status === 'expired') return true;
  if (status !== 'active' || !l.expires_at) return false;
  return new Date(l.expires_at).getTime() - now <= RENEW_WINDOW_DAYS * DAY_MS;
}

/** "Đã bán" chỉ có nghĩa với pass đồ / trọ; việc làm / thất lạc chỉ Đóng tin. */
export function canMarkSold(l: Pick<MyListing, 'category'>): boolean {
  const feature = featureOfCategory(l.category);
  return feature === 'pass' || feature === 'room';
}

export function manageActions(l: Pick<MyListing, 'status' | 'expires_at' | 'category'>, now: number): ManageAction[] {
  const status = ownerStatus(l, now);
  const out: ManageAction[] = ['edit'];
  if (status === 'active') {
    if (canMarkSold(l)) out.push('sold');
    out.push('close');
  }
  if (status === 'sold' || status === 'closed') out.push('reopen');
  if (status === 'rejected') out.push('resubmit');
  if (canRenew(l, now)) out.push('renew');
  out.push('delete');
  return out;
}

/** Tone badge trạng thái (giống app): có chữ, không chỉ màu. */
export const STATUS_TONE: Record<ListingStatus, BadgeTone> = {
  active: 'success',
  pending_review: 'warning',
  rejected: 'danger',
  draft: 'neutral',
  sold: 'primary',
  closed: 'neutral',
  expired: 'neutral',
};

/** Trạng thái có trang công khai /tin/[slug] (public_listings). */
export function hasPublicPage(status: ListingStatus): boolean {
  return status === 'active' || status === 'sold' || status === 'closed' || status === 'expired';
}
