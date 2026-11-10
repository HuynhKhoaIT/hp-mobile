// Tên sự kiện web (.claude/rules/web-marketing.md), trùng tên với app khi cùng ý nghĩa (apps/mobile/src/core/analytics/events.ts).
export type AnalyticsEvent =
  | 'cta_web_start'
  | 'cta_store_click'
  | 'qr_view'
  | 'lead_submit'
  | 'open_in_app_click'
  | 'app_promo_click';
