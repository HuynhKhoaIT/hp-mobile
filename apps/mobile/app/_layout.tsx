// Layout
// Khung tạm sau khi dựng monorepo. Tuần 1 (docs/plan/mobile.md) thay bằng providers đầy đủ:
// Query + persist MMKV, Supabase, Theme, i18n, Toast, BottomSheet, Sentry, PostHog.
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
