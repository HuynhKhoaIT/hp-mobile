// Layout
// Mini-app Gọi thợ (mẫu thứ ba: người cần đăng yêu cầu → thợ báo giá → chọn → chat → hoàn thành → đánh giá): thanh tab
// riêng thay thanh tab super app: [Việc quanh bạn] · Báo giá của tôi · (nút cam Đăng việc — không phải route: bắt đăng nhập
// → form request/new) · Chat (số hội thoại về yêu cầu chưa đọc) · Của tôi. Chi tiết yêu cầu / form mở chồng lên (Stack gốc:
// app/request/*), không có thanh tab. Màu riêng appThemes.goiTho (tím violet): AppThemeProvider bọc các tab + thanh tab.
// Cổng MiniAppGate: admin tắt Gọi thợ (bảng mini_apps) → màn "Chưa mở", chặn cả deep link. Mặc định TẮT cho tới khi admin bật.
// Back Android: tab khác → trang chủ mini-app (backBehavior firstRoute); trang chủ → rời mini-app (Stack gốc).
import { unreadBadge } from '@hp/shared';
import { useIsFocused } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { ClipboardList, Hammer, MessageSquareQuote, MessagesSquare, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useFeatureUnreadCount } from '@/features/chat/hooks';
import { MiniAppGate } from '@/features/home/components/MiniAppGate';
import { useNewRequestAction } from '@/features/tho/hooks';
import { AppThemeProvider, TabBar } from '@/ui';

/** Vị trí nút Đăng việc giữa các ô (sau Việc quanh bạn, Báo giá). */
const POST_INDEX = 2;

export default function ThoLayout() {
  return (
    <MiniAppGate code="goiTho">
      <ThoShell />
    </MiniAppGate>
  );
}

function ThoShell() {
  const { t } = useTranslation('tho');
  const focused = useIsFocused();
  const unread = useFeatureUnreadCount('goiTho');
  const newRequest = useNewRequestAction();
  const icons = { index: Hammer, quotes: MessageSquareQuote, chat: MessagesSquare, mine: ClipboardList };

  return (
    <>
      <AppThemeProvider theme="goiTho">
        <Tabs
          backBehavior="firstRoute"
          screenOptions={{ headerShown: false }}
          tabBar={(props) => (
            <TabBar
              {...props}
              icons={icons}
              badges={{ chat: unreadBadge(unread) }}
              action={{ index: POST_INDEX, label: t('tabs.new'), icon: Plus, onPress: () => newRequest() }}
              accessibilityLabel={t('title')}
            />
          )}
        >
          <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
          <Tabs.Screen name="quotes" options={{ title: t('tabs.quotes') }} />
          <Tabs.Screen name="chat" options={{ title: t('tabs.chat') }} />
          <Tabs.Screen name="mine" options={{ title: t('tabs.mine') }} />
        </Tabs>
      </AppThemeProvider>
      {/* Header gradient đậm ở mọi tab (cả giao diện tối): chữ / icon thanh trạng thái sáng. */}
      {focused ? <StatusBar style="light" /> : null}
    </>
  );
}
