// AppProviders — nơi duy nhất nối Supabase client, Query, i18n, BottomSheet cho cây React.
// Thứ tự ngoài → trong: Gesture → SafeArea → Keyboard → Supabase → Query (persist MMKV) → i18n → BottomSheet.
// KeyboardProvider (react-native-keyboard-controller): bàn phím mượt iOS / Android edge-to-edge cho Screen keyboard + chat.
// ToastHost nằm trong cùng cây (toast.show() gọi được ở mọi nơi). Sentry, PostHog: khi có DSN / key.
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SupabaseProvider, useNotificationsRealtime } from '@hp/core/react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { colorScheme } from 'nativewind';
import { type ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '@/ui/Toast';
import { i18n } from './i18n';
import { usePushBridge } from './notifications';
import { persistOptions, queryClient } from './query';
import { useSettings } from './settings';
import { supabase } from './supabase';

const fill = { flex: 1 } as const;

/** Việc nền cần providers: push (token + bấm thông báo mở màn), realtime thông báo (chuông). */
function AppBridges() {
  usePushBridge();
  useNotificationsRealtime();
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const themePref = useSettings((s) => s.themePref);

  // NativeWind đổi Appearance → biến màu :root (preset @hp/tokens) đổi theo.
  useEffect(() => {
    colorScheme.set(themePref);
  }, [themePref]);

  return (
    <GestureHandlerRootView style={fill}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <SupabaseProvider client={supabase}>
            <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
              <I18nextProvider i18n={i18n}>
                <BottomSheetModalProvider>
                  <AppBridges />
                  {children}
                  <ToastHost />
                </BottomSheetModalProvider>
              </I18nextProvider>
            </PersistQueryClientProvider>
          </SupabaseProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
