// Layout
// Gốc app: CSS NativeWind, i18n, providers (src/core/providers.tsx). Splash giữ tới khi font Be Vietnam Pro tải xong.
import '../global.css';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTrackLastPath } from '@/core/auth';
import { AppProviders } from '@/core/providers';
import { useScheme } from '@/ui';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });
  const scheme = useScheme();
  // Nhớ màn gần nhất để đăng nhập xong quay lại đúng chỗ (requireAuth).
  useTrackLastPath();
  // Lỗi tải font vẫn mở app (rơi về font hệ thống), không kẹt ở splash.
  const ready = fontsLoaded || fontError != null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </AppProviders>
  );
}
