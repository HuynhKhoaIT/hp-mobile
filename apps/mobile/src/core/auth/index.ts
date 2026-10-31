// Đăng nhập của app: requireAuth(action), quay lại đúng màn sau đăng nhập, đăng xuất.
// Khách bấm Liên hệ / Đăng / Tham gia / Lưu → requireAuth(() => action()) → (auth)/phone → otp → onboarding (nếu cần)
// → router.dismissTo(màn cũ) → chạy lại `action`. returnTo + pendingAction giữ trong Zustand (không đưa vào URL).
import {
  exchangeCodeForSession,
  fail,
  getMyProfile,
  keys,
  type MyProfile,
  needsOnboarding,
  type Result,
  signInWithGoogle,
  signOut,
} from '@hp/core';
import * as Linking from 'expo-linking';
import { type Href, router, usePathname } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { create } from 'zustand';
import { queryClient } from '../query';
import { supabase } from '../supabase';

/** Route của luồng đăng nhập — không lưu làm returnTo. */
const AUTH_ROUTES = new Set(['/phone', '/otp', '/onboarding']);

type AuthFlowState = {
  returnTo: string;
  pendingAction: (() => void) | null;
  lastPath: string;
};

const useAuthFlow = create<AuthFlowState>(() => ({ returnTo: '/', pendingAction: null, lastPath: '/' }));

// Phiên hiện tại cho requireAuth (hàm thường, không phải hook) — cập nhật theo Supabase.
let currentUserId: string | null = null;
void supabase.auth.getSession().then(({ data }) => {
  currentUserId = data.session?.user.id ?? null;
});
supabase.auth.onAuthStateChange((_event, session) => {
  currentUserId = session?.user.id ?? null;
});

/** Đặt ở RootLayout: nhớ màn gần nhất ngoài luồng đăng nhập để quay lại. */
export function useTrackLastPath() {
  const pathname = usePathname();
  useEffect(() => {
    if (!AUTH_ROUTES.has(pathname)) useAuthFlow.setState({ lastPath: pathname });
  }, [pathname]);
}

/** Chạy `action` nếu đã đăng nhập và đã onboarding; chưa thì mở đăng nhập rồi chạy lại sau. */
export function requireAuth(action?: () => void) {
  const profile = currentUserId ? queryClient.getQueryData<MyProfile>(keys.me(currentUserId)) : undefined;
  if (currentUserId && profile && !needsOnboarding(profile)) {
    action?.();
    return;
  }
  const { lastPath } = useAuthFlow.getState();
  useAuthFlow.setState({ returnTo: lastPath, pendingAction: action ?? null });
  router.push('/phone');
}

/** Gọi sau khi có phiên (OTP / Google, hoặc mở lại màn phone khi đã đăng nhập): onboarding hay kết thúc. */
export async function continueAfterSignIn(): Promise<'onboarding' | 'done' | 'error'> {
  const profile = await getMyProfile(supabase);
  if (profile.error) return 'error';
  queryClient.setQueryData(keys.me(profile.data.id), profile.data);
  if (needsOnboarding(profile.data)) {
    router.replace('/onboarding');
    return 'onboarding';
  }
  finishAuthFlow();
  return 'done';
}

/** Đóng luồng đăng nhập, về đúng màn cũ, chạy hành động đang chờ. */
export function finishAuthFlow() {
  const { returnTo, pendingAction } = useAuthFlow.getState();
  useAuthFlow.setState({ pendingAction: null, returnTo: '/' });
  if (router.canDismiss()) router.dismissTo(returnTo as Href);
  else router.replace(returnTo as Href);
  if (pendingAction) setTimeout(pendingAction, 0);
}

/** Đăng xuất: (tuần 6: xoá push token của máy trước) → Supabase → xoá cache dữ liệu theo người dùng. */
export async function signOutApp() {
  const result = await signOut(supabase);
  queryClient.clear();
  return result;
}

/**
 * Google OAuth trong app: mở trang Google bằng phiên trình duyệt hệ thống, nhận `code` qua
 * hoaphat://auth/callback (PKCE) rồi đổi lấy phiên. Người dùng huỷ → lỗi 'cancelled' (không hiện thông báo).
 */
export async function signInWithGoogleApp(): Promise<Result<{ userId: string }>> {
  const redirectTo = Linking.createURL('auth/callback');
  const start = await signInWithGoogle(supabase, { redirectTo, skipBrowserRedirect: true });
  if (start.error) return start;
  const session = await WebBrowser.openAuthSessionAsync(start.data.url, redirectTo);
  if (session.type !== 'success') return fail('cancelled');
  const code = new URL(session.url).searchParams.get('code');
  if (!code) return fail('unknown');
  return exchangeCodeForSession(supabase, code);
}
