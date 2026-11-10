// Đọc yêu cầu huy hiệu cho /admin/badges (staff, theo request). Giấy tờ KHÔNG ký sẵn ở đây — chỉ ký khi staff mở
// (getBadgeDocumentAction, signed URL 5 phút) để link không nằm trong HTML danh sách.
import 'server-only';
import { type AdminBadgeRequest, type AdminPage, type BadgeRequestStatus, countBadgeRequests, listBadgeRequests } from '@hp/core';
import { pageOf, pick, pickQuery, type Query, type SearchParams } from '../lib/params';
import { staffOrThrow, unwrap } from '../lib/server';

export type BadgesData = { page: AdminPage<AdminBadgeRequest>; counts: Record<BadgeRequestStatus, number>; query: Query; now: number };

export async function getBadgesPage(params: SearchParams): Promise<BadgesData> {
  const staff = await staffOrThrow();
  const [page, counts] = await Promise.all([
    listBadgeRequests(staff.supabase, { status: pick(params, 'status'), badge: pick(params, 'badge'), page: pageOf(params) }),
    countBadgeRequests(staff.supabase),
  ]);
  return { page: unwrap(page), counts: unwrap(counts), query: pickQuery(params, ['status', 'badge', 'page']), now: Date.now() };
}
