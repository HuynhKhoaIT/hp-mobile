// Screen type: List
// Tab "Chat" của mini-app Gọi thợ: hộp thư khoá theo Gọi thợ (InboxList feature='goiTho' — chỉ hội thoại về yêu cầu, không
// chip lọc). Bấm → màn chat (chồng lên, không thanh tab; header có thẻ yêu cầu). Khách → mời đăng nhập; rỗng → "Xem yêu cầu".
import { useTranslation } from 'react-i18next';
import { InboxList } from '@/features/chat/components/InboxList';
import { ThoTabHeader } from '@/features/tho/components/ThoTabHeader';
import { openThoTab } from '@/features/tho/navigation';
import { Screen } from '@/ui';

export default function ThoChatScreen() {
  const { t } = useTranslation(['chat', 'tho']);
  return (
    <Screen tab statusBar="app">
      <ThoTabHeader title={t('chat:title')} />
      <InboxList feature="goiTho" emptyAction={{ label: t('tho:mine.empty_quotes_cta'), onPress: () => openThoTab('index') }} />
    </Screen>
  );
}
