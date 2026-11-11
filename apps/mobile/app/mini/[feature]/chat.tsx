// Screen type: List
// Tab "Chat" của mini-app: header (← trang chủ mini-app + tiêu đề) → hộp thư khoá theo tính năng (InboxList feature — không
// chip lọc; chỉ hội thoại về tin của tính năng). Bấm → màn chat (chồng lên, không thanh tab). Khách → mời đăng nhập; rỗng →
// "Xem tin mới" về trang chủ mini-app.
import { useTranslation } from 'react-i18next';
import { InboxList } from '@/features/chat/components/InboxList';
import { MiniTabHeader } from '@/features/listing/components/mini/MiniHeader';
import { useMiniApp } from '@/features/listing/miniApp';
import { openMiniTab } from '@/features/listing/navigation';
import { Screen } from '@/ui';

export default function MiniChatScreen() {
  const { t } = useTranslation(['chat', 'listing']);
  const { config } = useMiniApp();
  return (
    <Screen tab statusBar="primary">
      <MiniTabHeader title={t('title')} />
      <InboxList
        feature={config.key}
        emptyAction={{ label: t('listing:mini_app.saved.empty_cta'), onPress: () => openMiniTab(config.slug, 'index') }}
      />
    </Screen>
  );
}
