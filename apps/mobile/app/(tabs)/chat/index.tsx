// Screen type: List
// Tab Tin nhắn (style Stitch "Danh sách hộp thư Chat"): header xanh PageHero (tiêu đề + dòng phụ, hoạ tiết HeroDecor, bo đáy)
// → hộp thư (InboxList: hàng chip lọc tại chỗ Tất cả · Chưa đọc có số · dịch vụ có trong hộp thư → thẻ hội thoại mới nhất
// trước, cursor → hộp nhắc giao dịch an toàn cuối danh sách). Realtime làm mới khi có tin (useInboxRealtime ở layout tab).
// Khách → mời đăng nhập; rỗng → mời xem tin; lọc không có kết quả → "Xem tất cả"; lỗi → thử lại; kéo để làm mới.
// Không có tìm kiếm / "Đã đọc tất cả" / chuyến đang diễn ra của Stitch: chưa có RPC tương ứng.
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { InboxList } from '@/features/chat/components/InboxList';
import { PageHero, Screen, useScheme } from '@/ui';

export default function ChatListScreen() {
  const { t } = useTranslation('chat');
  const scheme = useScheme();
  const focused = useIsFocused();

  return (
    <Screen tab>
      <PageHero title={t('title')} subtitle={t('inbox.subtitle')} />
      <InboxList emptyAction={{ label: t('inbox.empty_cta'), onPress: () => router.navigate('/explore') }} />
      {/* Header xanh: chữ / icon thanh trạng thái tương phản với primary (sáng → chữ trắng, tối → chữ tối). */}
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}
