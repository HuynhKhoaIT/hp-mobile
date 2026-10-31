// Layout
// 5 tab: Trang chủ · Khám phá · Đăng (+, nút cam) · Tin nhắn · Tôi. Thanh tab tự vẽ (@/ui TabBar): icon luôn kèm chữ,
// tab đang mở nảy nhẹ, nút Đăng xoay 45°. Màn trong tab không có Header; màn chi tiết / form mở chồng lên (Stack gốc).
import { Tabs } from 'expo-router/js-tabs';
import { Compass, House, MessageCircle, Plus, UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { TabBar } from '@/ui';

const ICONS = { index: House, explore: Compass, post: Plus, 'chat/index': MessageCircle, me: UserRound };

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} icons={ICONS} accent="post" />}>
      <Tabs.Screen name="index" options={{ title: t('nav.home') }} />
      <Tabs.Screen name="explore" options={{ title: t('nav.explore') }} />
      <Tabs.Screen name="post" options={{ title: t('nav.post') }} />
      <Tabs.Screen name="chat/index" options={{ title: t('nav.messages') }} />
      <Tabs.Screen name="me" options={{ title: t('nav.me') }} />
    </Tabs>
  );
}
