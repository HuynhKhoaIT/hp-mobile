// Thông báo + push (migration 20261102100000_push_notifications). Danh sách / đếm / đánh dấu đọc ở social.ts.
// Push token chỉ đổi qua RPC (token thuộc đúng một người, tối đa 5); tuỳ chọn push theo nhóm NOTIFICATION_PREF_KEYS.
import { isExpoPushToken, NOTIFICATION_PREF_KEYS, type NotificationPrefs } from '@hp/shared';
import { type Client, fail, fromSupabase, ok, type Result } from './result';
import { MY_PROFILE_COLUMNS, type MyProfile } from './profile';
import type { Notification } from './social';

/** Gắn Expo push token của máy vào tài khoản đang đăng nhập (gọi sau đăng nhập / khi token đổi). */
export async function registerPushToken(client: Client, token: string): Promise<Result<null>> {
  if (!isExpoPushToken(token)) return fail('invalid_input');
  const res = await client.rpc('register_push_token', { p_token: token });
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}

/** Bỏ token của máy khỏi tài khoản — gọi TRƯỚC khi đăng xuất (sau đó không còn quyền). */
export async function unregisterPushToken(client: Client, token: string): Promise<Result<null>> {
  const res = await client.rpc('unregister_push_token', { p_token: token });
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}

/** Đọc tuỳ chọn push (thiếu khoá = bật) thành đủ 4 nhóm cho màn Cài đặt. */
export function readNotificationPrefs(raw: unknown): Required<NotificationPrefs> {
  const p = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(NOTIFICATION_PREF_KEYS.map((k) => [k, p[k] !== false])) as Required<NotificationPrefs>;
}

/** Ghi tuỳ chọn push (đủ 4 nhóm). DB CHECK chỉ nhận nhóm đã biết + boolean. */
export async function updateNotificationPrefs(client: Client, prefs: NotificationPrefs): Promise<Result<MyProfile>> {
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return fail('auth_required');
  const clean = readNotificationPrefs(prefs);
  return fromSupabase(
    await client.from('profiles').update({ notification_prefs: clean }).eq('id', auth.user.id).select(MY_PROFILE_COLUMNS).maybeSingle(),
    true,
  );
}

/** Nghe thông báo mới của chính mình (chấm đỏ chuông / danh sách). Trả hàm huỷ. */
export function subscribeToNotifications(
  client: Client,
  v: { userId: string; onInsert: (n: Notification) => void },
): () => void {
  const channel = client
    .channel(`notifications:${v.userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${v.userId}` },
      (payload) => v.onInsert(payload.new as Notification),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
