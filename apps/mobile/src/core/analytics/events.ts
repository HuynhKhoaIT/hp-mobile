// Tên event analytics (snake_case) — thống nhất với web (apps/web/src/lib/analytics/events.ts, tuần 6).
// Route / feature chỉ gọi track() với tên trong danh sách này (.claude/rules/mobile-routes.md).
export const EVENTS = [
  'view_listing',
  'contact',
  'create_listing',
  'join_group',
  'search',
  'save_listing',
  'login_success',
  'share_listing',
] as const;

export type AnalyticsEvent = (typeof EVENTS)[number];
