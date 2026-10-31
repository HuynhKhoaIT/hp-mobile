// Screen type: List
// Thông báo (chuông ở header Hub). Trung tâm thông báo làm ở tuần 6 (push + danh sách notifications); hiện là "Sắp có".
import { Bell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { backOrHome } from '@/features/listing/navigation';
import { EmptyState, Header, Screen } from '@/ui';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Header title={t('nav.notifications')} back onBack={backOrHome} />
      <EmptyState
        icon={Bell}
        title={t('coming_soon.title')}
        description={t('coming_soon.body')}
        action={{ label: t('actions.back'), onPress: backOrHome }}
      />
    </Screen>
  );
}
