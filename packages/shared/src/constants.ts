import type { ListingFeature } from './enums';

/** Tên hiển thị (store, tiêu đề trang, push). Định danh kỹ thuật (slug, bundle id, domain, scheme) chưa chốt — docs/PLAN.md mục 2. */
export const APP_NAME = 'Người Dung Quất';

/** Key i18n của dòng miễn trừ bắt buộc ở app, footer web và trang store. */
export const APP_DISCLAIMER_KEY = 'common.disclaimer';

/** Số ngày trước khi tin tự hết hạn (listings.expires_at mặc định). */
export const EXPIRES_DAYS = {
  pass: 30,
  room: 30,
  job: 14,
  lostFound: 60,
} as const satisfies Record<ListingFeature, number>;

/** Giới hạn tần suất (bảng rate_limits). Server mới là nơi chặn; client chỉ dùng để hiện thông báo trước. */
export const RATE_LIMITS = {
  listingsPerDay: 10,
  messagesPerHourNewAccount: 50,
  otpPerPhonePerHour: 5,
  reportsPerHour: 3,
  leadsPerIpPerHour: 5,
  revealContactPerHour: 20,
} as const;

/** Tài khoản dưới số ngày này bị giới hạn chặt hơn và tin đầu tiên vào hàng chờ duyệt. */
export const NEW_ACCOUNT_DAYS = 7;

/** Ảnh tin đăng. */
export const LISTING_IMAGES = { min: 1, max: 10, roomMin: 3, longEdgePx: 1280, quality: 0.8, maxBytes: 2 * 1024 * 1024 } as const;

/** Màn hình đích của thông báo / push: payload `data = { screen, params }`. */
export const NOTIFICATION_SCREENS = {
  new_message: 'chat',
  join_request: 'group',
  join_accepted: 'group',
  group_reminder: 'group',
  listing_approved: 'listing',
  listing_rejected: 'listing',
  listing_expiring: 'listing',
  lost_found_match: 'listing',
} as const;
export type NotificationType = keyof typeof NOTIFICATION_SCREENS;
export type NotificationScreen = (typeof NOTIFICATION_SCREENS)[NotificationType] | 'notifications';

/** Phiên bản điều khoản + chính sách đang hiển thị; ghi vào profiles.consent_version khi người dùng đồng ý (Nghị định 13/2023). */
export const CONSENT_VERSION = '2026-10-31';

/** Mã OTP qua SMS / Zalo: 6 chữ số; chờ trước khi cho gửi lại. */
export const OTP_LENGTH = 6;
export const OTP_RESEND_SECONDS = 60;
