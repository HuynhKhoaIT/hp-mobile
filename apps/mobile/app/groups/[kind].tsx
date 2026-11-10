// Screen type: List
// Danh sách nhóm theo kind (ride | sport) — một màn cho Ghép xe và Ghép trận, khác nhau chỉ ở config.ts (quy tắc vàng).
// Tìm theo chữ, lọc khoảng ngày + loại con; nút Tạo → form (khách đăng nhập trước). Kind sai → về trang chủ.
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { GROUP_CONFIGS, isGroupKind } from '@/features/configs';
import { GroupBrowser } from '@/features/group/components/GroupBrowser';
import { useCreateGroupAction } from '@/features/group/hooks';
import { backOrHome } from '@/features/group/navigation';
import { Fab, Header, Screen } from '@/ui';

export default function GroupListScreen() {
  const { t } = useTranslation('group');
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const create = useCreateGroupAction(isGroupKind(kind) ? kind : 'ride');
  if (!isGroupKind(kind)) return <Redirect href="/" />;
  const config = GROUP_CONFIGS[kind];

  return (
    <Screen>
      <Header title={t(config.labels.title)} back onBack={backOrHome} />
      {/* key: đổi kind → state bộ lọc mới. */}
      <GroupBrowser key={kind} config={config} />
      <Fab label={t(config.labels.create)} icon={Plus} onPress={create} />
    </Screen>
  );
}
