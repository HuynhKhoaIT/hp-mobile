// Screen type: List
// Danh sách nhóm theo kind (ride | sport). Engine features/group làm ở tuần 7–8; hiện là trạng thái "Sắp ra mắt".
import { GROUP_KINDS, type GroupKind } from '@hp/shared';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { backOrHome } from '@/features/listing/navigation';
import { EmptyState, Header, SERVICE, Screen } from '@/ui';

const isGroupKind = (v: string | undefined): v is GroupKind => !!v && (GROUP_KINDS as readonly string[]).includes(v);

export default function GroupListScreen() {
  const { t } = useTranslation();
  const { kind } = useLocalSearchParams<{ kind: string }>();
  if (!isGroupKind(kind)) return <Redirect href="/" />;

  return (
    <Screen>
      <Header title={t(`feature.${kind}`)} back onBack={backOrHome} />
      <EmptyState
        icon={SERVICE[kind].icon}
        title={t('coming_soon.title')}
        description={t('coming_soon.body')}
        action={{ label: t('actions.back'), onPress: backOrHome }}
      />
    </Screen>
  );
}
