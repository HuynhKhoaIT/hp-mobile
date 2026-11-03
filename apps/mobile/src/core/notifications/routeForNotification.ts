// Payload thông báo / push (data = { screen, params }) → route Expo Router. Route không tự parse payload push.
// Thêm loại / màn đích mới = thêm 1 nhánh ở đây (đọc payload an toàn bằng notificationTarget của @hp/shared).
import { notificationTarget } from '@hp/shared';
import type { Href } from 'expo-router';

/**
 * chat → hội thoại (new_message 1-1 + nhóm) · listing → chi tiết tin (listing_*, kể cả listing_expiring: từ chi tiết tin
 * của mình chủ tin vào "Tin của tôi" để gia hạn) · group (join_* / group_cancelled tuần 7; group_reminder /
 * group_completed tuần 8 — chi tiết có Chat nhóm / Đánh giá) → chi tiết nhóm · khác → Thông báo.
 */
export function routeForNotification(data: unknown): Href {
  const t = notificationTarget(data);
  switch (t.screen) {
    case 'chat':
      return { pathname: '/chat/[conversationId]', params: { conversationId: t.id ?? '' } };
    case 'listing':
      return { pathname: '/listing/[id]', params: { id: t.id ?? '' } };
    case 'group':
      return { pathname: '/group/[id]', params: { id: t.id ?? '' } };
    default:
      return '/notifications';
  }
}

