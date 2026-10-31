// Screen type: List
// Tab Tin nhắn: danh sách hội thoại ở tuần 5 (features/chat). Hiện tại là trạng thái "Sắp ra mắt".
import { MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { EmptyState, Screen, Text } from '@/ui';

export default function ChatListScreen() {
  const { t } = useTranslation();
  return (
    <Screen tab>
      <Text variant="heading" accessibilityRole="header" className="pb-3 pt-4">
        {t('nav.messages')}
      </Text>
      <EmptyState
        icon={MessageCircle}
        title={t('coming_soon.title')}
        description={t('coming_soon.body')}
        action={{ label: t('nav.explore'), onPress: () => router.navigate('/explore') }}
      />
    </Screen>
  );
}
