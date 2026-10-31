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
  // Trang chủ (docs/design/home.md §7)
  'home_view',
  'home_tile_click',
  'home_banner_click',
  'home_shortcut_click',
  'home_rail_click',
  'home_rail_see_all',
  'home_site_change',
  'home_card_cta',
] as const;

export type AnalyticsEvent = (typeof EVENTS)[number];
