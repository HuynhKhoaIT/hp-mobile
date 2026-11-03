// Thông báo + push (tuần 6): nhóm tuỳ chọn bật / tắt push, map loại thông báo → nhóm, đọc payload deep link.
// Dùng chung app (routeForNotification), web (/thong-bao), Edge Function send-push (Deno). Không import file nào để
// chạy được ở cả ba nơi + node --test; constants.ts kiểm tra kiểu để danh sách ở đây khớp NOTIFICATION_SCREENS.

/** Màn đích của payload thông báo (giá trị NOTIFICATION_SCREENS + 'notifications'). */
export const NOTIFICATION_TARGET_SCREENS = ['chat', 'group', 'listing', 'notifications'] as const;
export type NotificationTargetScreen = (typeof NOTIFICATION_TARGET_SCREENS)[number];

/** Loại thông báo có push theo nhóm (khoá của NOTIFICATION_SCREENS). */
type PushNotificationType =
  | 'new_message'
  | 'listing_approved'
  | 'listing_rejected'
  | 'listing_expiring'
  | 'join_request'
  | 'join_accepted'
  | 'join_declined'
  | 'group_cancelled'
  | 'group_reminder'
  | 'group_completed'
  | 'lost_found_match';

/**
 * Nhóm bật / tắt PUSH trong Cài đặt (profiles.notification_prefs = { <nhóm>: boolean }, thiếu = bật).
 * Chỉ ảnh hưởng push; danh sách thông báo trong app luôn đủ.
 */
export const NOTIFICATION_PREF_KEYS = ['messages', 'listings', 'groups', 'lost_found'] as const;
export type NotificationPrefKey = (typeof NOTIFICATION_PREF_KEYS)[number];
export type NotificationPrefs = Partial<Record<NotificationPrefKey, boolean>>;

const PREF_OF_TYPE: Record<PushNotificationType, NotificationPrefKey> = {
  new_message: 'messages',
  listing_approved: 'listings',
  listing_rejected: 'listings',
  listing_expiring: 'listings',
  join_request: 'groups',
  join_accepted: 'groups',
  join_declined: 'groups',
  group_cancelled: 'groups',
  group_reminder: 'groups',
  group_completed: 'groups',
  lost_found_match: 'lost_found',
};

/** Nhóm tuỳ chọn của một loại thông báo; loại lạ (vd 'system') → null = luôn push. */
export function prefKeyOfType(type: string): NotificationPrefKey | null {
  return (PREF_OF_TYPE as Record<string, NotificationPrefKey | undefined>)[type] ?? null;
}

/** Push loại này có bật không (thiếu khoá = bật). Cùng logic với SQL notification_push_enabled. */
export function isPushEnabled(prefs: unknown, type: string): boolean {
  const key = prefKeyOfType(type);
  if (!key || !prefs || typeof prefs !== 'object') return true;
  return (prefs as Record<string, unknown>)[key] !== false;
}

/** Số tối đa thiết bị nhận push / người (token cũ nhất bị bỏ). */
export const MAX_PUSH_TOKENS = 5;

/** Expo push token: ExponentPushToken[...] / ExpoPushToken[...]. */
export const isExpoPushToken = (token: string) => /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(token);

export type NotificationTarget = { screen: NotificationTargetScreen; id: string | null };

/**
 * Đọc payload `data = { screen, params: { id } }` (notifications.data / push data) một cách an toàn.
 * Thiếu / sai `screen` → mở tab Thông báo (.claude/rules/mobile-core.md luật 4).
 */
export function notificationTarget(data: unknown): NotificationTarget {
  const d = data && typeof data === 'object' ? (data as { screen?: unknown; params?: { id?: unknown } }) : {};
  const screen = NOTIFICATION_TARGET_SCREENS.find((s) => s === d.screen) ?? 'notifications';
  const id = typeof d.params?.id === 'string' && d.params.id.length > 0 ? d.params.id : null;
  if (screen === 'notifications' || !id) return { screen: 'notifications', id: null };
  return { screen, id };
}

/** Điền `{{x}}` trong template i18n (dùng ở send-push, nơi không có i18next). Thiếu tham số → chuỗi rỗng. */
export function interpolate(template: string, params: Record<string, unknown> = {}): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    const v = params[key];
    return v === null || v === undefined ? '' : String(v);
  });
}
