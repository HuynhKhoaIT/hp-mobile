// Push trên app (.claude/rules/mobile-core.md): đăng ký Expo push token → profiles.push_tokens (RPC), mở đúng màn khi
// bấm thông báo (data = { screen, params }), kênh Android "default", không hiện banner cho hội thoại đang mở.
// Quyền: KHÔNG tự bật hộp thoại hệ thống lúc mở app — chỉ xin khi người dùng bấm "Bật thông báo" (màn Thông báo /
// Cài đặt thông báo). Đã cho phép → tự đăng ký token mỗi lần đăng nhập. Web: không push (Expo web không hỗ trợ).
import { markNotificationsRead, registerPushToken, unregisterPushToken } from '@hp/core';
import { useSession } from '@hp/core/react';
import { notificationTarget } from '@hp/shared';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { kv, storage } from '../storage';
import { routeForNotification } from './routeForNotification';
import { supabase } from '../supabase';

const supported = Platform.OS !== 'web';
const TOKEN_KEY = 'push.token';
const store = kv(storage);

// ── Hiện thông báo khi app đang mở ─────────────────────────────────────────────

/** Hội thoại đang mở trên màn hình: push của nó không hiện banner (tin đã hiện realtime). */
let activeConversationId: string | null = null;
export function setActiveConversation(id: string | null) {
  activeConversationId = id;
}

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const target = notificationTarget(n.request.content.data);
      const silent = target.screen === 'chat' && target.id !== null && target.id === activeConversationId;
      return { shouldShowBanner: !silent, shouldShowList: !silent, shouldPlaySound: !silent, shouldSetBadge: false };
    },
  });
}

// ── Điều hướng ──────────────────────────────────────────────────────────────────

export { routeForNotification };

/** Mở màn từ thông báo (bấm push, hoặc dòng trong danh sách) + đánh dấu đã đọc. */
export function openNotification(data: unknown, notificationId?: string | null) {
  const id = notificationId ?? (data as { notification_id?: unknown } | null)?.notification_id;
  if (typeof id === 'string') void markNotificationsRead(supabase, [id]);
  router.push(routeForNotification(data));
}

// ── Quyền + token ───────────────────────────────────────────────────────────────

export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
  });
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Lấy token (cần máy thật + EAS projectId) rồi gắn vào tài khoản. Thiếu điều kiện → bỏ qua, không lỗi. */
async function syncToken() {
  if (!supported || !Device.isDevice) return;
  const id = projectId();
  if (!id) {
    if (__DEV__) console.warn('[push] Chưa có EAS projectId (eas init) — bỏ qua đăng ký push token');
    return;
  }
  await ensureAndroidChannel();
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  const res = await registerPushToken(supabase, token);
  if (!res.error) store.setItem(TOKEN_KEY, token);
}

export async function getPushPermission(): Promise<PushPermission> {
  if (!supported) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/** Người dùng bấm "Bật thông báo": hỏi quyền hệ thống (bị từ chối hẳn → mở Cài đặt máy), được → đăng ký token. */
export async function requestPushPermission(): Promise<PushPermission> {
  if (!supported) return 'unsupported';
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'denied' && !current.canAskAgain) {
    await Linking.openSettings();
    return 'denied';
  }
  await ensureAndroidChannel();
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') await syncToken();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/** Gọi TRƯỚC khi đăng xuất: bỏ token khỏi tài khoản (máy này không nhận push của tài khoản cũ nữa). */
export async function unregisterPushOnSignOut() {
  const token = store.getItem(TOKEN_KEY);
  if (!token) return;
  await unregisterPushToken(supabase, token);
  store.removeItem(TOKEN_KEY);
}

/** Quyền push hiện tại, cập nhật khi quay lại app (người dùng có thể vừa bật trong Cài đặt máy). */
export function usePushPermission() {
  const [status, setStatus] = useState<PushPermission>(supported ? 'undetermined' : 'unsupported');
  useEffect(() => {
    if (!supported) return;
    const refresh = () => void getPushPermission().then(setStatus);
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, []);
  return {
    status,
    request: async () => setStatus(await requestPushPermission()),
  };
}

/**
 * Đặt một lần trong cây providers: đã đăng nhập + đã cho phép → đồng bộ token (cả khi token đổi); bấm thông báo
 * (kể cả mở app từ trạng thái tắt) → mở đúng màn.
 */
export function usePushBridge() {
  const { userId } = useSession();

  useEffect(() => {
    if (!supported || !userId) return;
    void getPushPermission().then((s) => {
      if (s === 'granted') void syncToken();
    });
    const sub = Notifications.addPushTokenListener(() => void syncToken());
    return () => sub.remove();
  }, [userId]);

  useEffect(() => {
    if (!supported) return;
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) openNotification(r.notification.request.content.data);
    });
    const sub = Notifications.addNotificationResponseReceivedListener((r) => openNotification(r.notification.request.content.data));
    return () => sub.remove();
  }, []);
}
