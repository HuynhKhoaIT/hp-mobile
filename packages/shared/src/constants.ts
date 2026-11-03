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
  groupsPerDay: 10,
  groupJoinsPerHour: 20,
  venuesPerDay: 5,
  badgeRequestsPerDay: 3,
  translatePerHour: 30,
} as const;

/** Nhắc gia hạn tin trước khi hết hạn (cron expire_content). */
export const LISTING_EXPIRING_NOTICE_DAYS = 3;

/** Khớp đồ thất lạc (trigger trg_listings_match_lost_found): cùng loại đồ, chênh ≤ days ngày, cách < radiusM. */
export const LOST_FOUND_MATCH = { days: 2, radiusM: 2000 } as const;

/** Giấy tờ huy hiệu / tài khoản xoá mềm được xoá hẳn sau số ngày này (Edge Function purge-files, Nghị định 13). */
export const PURGE_AFTER_DAYS = 30;

/** Huy hiệu người dùng tự xin (kèm giấy tờ); 'phone' gán tự động khi đăng ký bằng SĐT. */
export const REQUESTABLE_BADGES = ['worker', 'landlord', 'venue', 'employer'] as const;
export type RequestableBadge = (typeof REQUESTABLE_BADGES)[number];

/** Giấy tờ: ảnh (nén webp / jpg) hoặc PDF, ≤ 5 MB — bucket verification. */
export const VERIFICATION_FILE = { maxBytes: 5 * 1024 * 1024, longEdgePx: 1600, exts: ['webp', 'jpg', 'pdf'] as const } as const;

/** Path giấy tờ trong bucket verification: `{userId}/{badge}/{timestamp}.{ext}` (RPC request_badge_tx kiểm lại). */
export function verificationPath(userId: string, badge: RequestableBadge, ext: 'webp' | 'jpg' | 'pdf', now = Date.now()): string {
  return `${userId}/${badge}/${now}.${ext}`;
}

/** Tài khoản dưới số ngày này bị giới hạn chặt hơn và tin đầu tiên vào hàng chờ duyệt. */
export const NEW_ACCOUNT_DAYS = 7;

/** Ảnh tin đăng. */
export const LISTING_IMAGES = { min: 1, max: 10, roomMin: 3, longEdgePx: 1280, quality: 0.8, maxBytes: 2 * 1024 * 1024 } as const;

/** Màn hình đích của thông báo / push: payload `data = { screen, params }`. */
export const NOTIFICATION_SCREENS = {
  new_message: 'chat',
  join_request: 'group',
  join_accepted: 'group',
  join_declined: 'group',
  group_cancelled: 'group',
  group_reminder: 'group',
  group_completed: 'group',
  listing_approved: 'listing',
  listing_rejected: 'listing',
  listing_expiring: 'listing',
  lost_found_match: 'listing',
} as const;
export type NotificationType = keyof typeof NOTIFICATION_SCREENS;
export type NotificationScreen = (typeof NOTIFICATION_SCREENS)[NotificationType] | 'notifications';
// notifications.ts tự khai báo danh sách màn đích (không import để chạy được trong Deno): hai nơi phải khớp.
type _SameScreens = [NotificationScreen] extends [import('./notifications').NotificationTargetScreen]
  ? [import('./notifications').NotificationTargetScreen] extends [NotificationScreen]
    ? true
    : never
  : never;
const notificationScreensMatch: _SameScreens = true;
void notificationScreensMatch;

/** Phiên bản điều khoản + chính sách đang hiển thị; ghi vào profiles.consent_version khi người dùng đồng ý (Nghị định 13/2023). */
export const CONSENT_VERSION = '2026-10-31';

/** Mã OTP qua SMS / Zalo: 6 chữ số; chờ trước khi cho gửi lại. */
export const OTP_LENGTH = 6;
export const OTP_RESEND_SECONDS = 60;
