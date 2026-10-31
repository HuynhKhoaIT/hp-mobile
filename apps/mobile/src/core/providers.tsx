// AppProviders — nơi duy nhất nối Supabase client, Query, i18n, BottomSheet cho cây React.
// Thứ tự ngoài → trong: Gesture → SafeArea → Supabase → Query (persist MMKV) → i18n → BottomSheet.
// ToastHost nằm trong cùng cây (toast.show() gọi được ở mọi nơi). Sentry, PostHog: khi có DSN / key.
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SupabaseProvider } from '@hp/core/react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { colorScheme } from 'nativewind';
import { type ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '@/ui/Toast';
import { i18n } from './i18n';
import { persistOptions, queryClient } from './query';
import { useSettings } from './settings';
import { supabase } from './supabase';

const fill = { flex: 1 } as const;

export function AppProviders({ children }: { children: ReactNode }) {
  const themePref = useSettings((s) => s.themePref);

  // NativeWind đổi Appearance → biến màu :root (preset @hp/tokens) đổi theo.
  useEffect(() => {
    colorScheme.set(themePref);
  }, [themePref]);

  return (
    <GestureHandlerRootView style={fill}>
      <SafeAreaProvider>
        <SupabaseProvider client={supabase}>
          <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
            <I18nextProvider i18n={i18n}>
              <BottomSheetModalProvider>
                {children}
                <ToastHost />
              </BottomSheetModalProvider>
            </I18nextProvider>
          </PersistQueryClientProvider>
        </SupabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
