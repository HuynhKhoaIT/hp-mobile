// Quy tắc hiển thị "Tin của tôi" (thuần, không React): trạng thái hiện, thao tác được phép trong menu, hàng thao tác nhanh. Chỉ là UI —
// DB (trigger guard, renew_listing) mới quyết định; thao tác sai trả lỗi (forbidden / too_early) và hiện toast.
// Khớp app (hợp đồng tuần 4): Sửa · Đánh dấu đã bán (chỉ pass đồ / trọ) · Đóng tin · Mở lại (đã bán / đã đóng)
// · Gửi duyệt lại (bị từ chối → DB chuyển pending_review, lý do `resubmit`) · Gia hạn (≤ 3 ngày cuối hoặc đã hết hạn) · Xoá.
// Đồ thất lạc (Stitch L2 "Đồ thất lạc của tôi", khớp app MyListingRow): đang đăng, chưa trả → "Đã nhận lại đồ" / "Đã trả cho
// chủ" (mark_listing_returned) là nút nhanh chính; đã trả lại → không còn Mở lại, nút nhanh chính "Cảm ơn người trả đồ" /
// "Đánh giá người nhận" (rate_listing — RateListingDialog).
import { FEATURE_LISTINGS_TABS, type FeatureListingsTab, type MyListing, type MyListingsTab } from '@hp/core';
import { featureOfCategory, type ListingStatus } from '@hp/shared';
import type { BadgeTone } from '@/components/shared/badge';
import { isReturned } from './display';

const DAY_MS = 24 * 60 * 60 * 1000;
export const RENEW_WINDOW_DAYS = 3;

/** Tab "Tin của tôi" (listMyListings): Chờ duyệt gồm cả bị từ chối; Đã đóng gồm đã bán / đã đóng / hết hạn. */
export const MY_LISTING_TABS: readonly MyListingsTab[] = ['active', 'pending', 'draft', 'closed'];

/** Tab "Quản lý tin" của mini-app (?tab=active|sold|pending|hidden — listFeatureListings); sai / thiếu → Đang bán. */
export function parseFeatureTab(raw: string | string[] | undefined): FeatureListingsTab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (FEATURE_LISTINGS_TABS as readonly string[]).includes(v ?? '') ? (v as FeatureListingsTab) : 'active';
}

export type ManageAction = 'edit' | 'sold' | 'returned' | 'rate' | 'close' | 'reopen' | 'resubmit' | 'renew' | 'delete';

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

export function manageActions(l: Pick<MyListing, 'status' | 'expires_at' | 'category' | 'attributes'>, now: number): ManageAction[] {
  const status = ownerStatus(l, now);
  const returned = featureOfCategory(l.category) === 'lostFound' && isReturned(l);
  const out: ManageAction[] = ['edit'];
  if (status === 'active') {
    if (canMarkSold(l)) out.push('sold');
    if (featureOfCategory(l.category) === 'lostFound' && !returned) out.push('returned');
    out.push('close');
  }
  if ((status === 'sold' || status === 'closed') && !returned) out.push('reopen');
  if (returned) out.push('rate');
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

/** Tin đã ngừng hiển thị (thẻ quản lý viền đứt, ảnh nhạt, chữ muted). */
export function isInactive(status: ListingStatus): boolean {
  return status === 'sold' || status === 'closed' || status === 'expired';
}

export type QuickAction = { action: Exclude<ManageAction, 'delete'>; tone: 'primary' | 'accent' | 'outline' };

/**
 * Hàng thao tác nhanh dưới thẻ "Tin của tôi" (style Stitch): tối đa 1 nút chính + 2 nút viền, chọn trong `actions`
 * (manageActions). Xoá chỉ ở menu ⋮. Bị từ chối → Gửi duyệt lại + Sửa; nháp / chờ duyệt → Sửa; đang đăng → (Gia hạn)
 * + Sửa + Đã bán / Đóng tin; hết hạn → Gia hạn + Sửa; đã bán / đã đóng → Mở lại + Sửa.
 */
export function quickActions(status: ListingStatus, actions: readonly ManageAction[]): QuickAction[] {
  const out: QuickAction[] = [];
  const add = (action: QuickAction['action'], tone: QuickAction['tone']) => {
    if (actions.includes(action)) out.push({ action, tone });
  };
  switch (status) {
    case 'rejected':
      add('resubmit', 'primary');
      add('edit', 'outline');
      break;
    case 'draft':
    case 'pending_review':
      add('edit', 'primary');
      break;
    case 'active':
      if (actions.includes('returned')) {
        add('returned', 'primary');
        add('edit', 'outline');
        break;
      }
      add('renew', 'accent');
      add('edit', 'outline');
      if (actions.includes('sold')) add('sold', 'outline');
      else add('close', 'outline');
      break;
    case 'expired':
      add('renew', 'accent');
      add('edit', 'outline');
      break;
    case 'sold':
    case 'closed':
      add('rate', 'primary');
      add('reopen', 'outline');
      add('edit', 'outline');
      break;
  }
  return out;
}
