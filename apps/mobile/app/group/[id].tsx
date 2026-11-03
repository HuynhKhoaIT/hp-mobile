// Screen type: Detail
// Chi tiết nhóm theo id — điều hướng nội bộ (card) và push join_request / join_accepted / join_declined / group_cancelled.
// Mở ngay bằng dữ liệu tạm từ cache danh sách (useGroup), rồi làm mới từ public_groups.
import { useGroup } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GROUP_CONFIGS } from '@/features/configs';
import { GroupDetailState } from '@/features/group/components/GroupDetail';
import { GroupHeaderActions } from '@/features/group/components/GroupHeaderActions';
import { backOrHome } from '@/features/group/navigation';
import { Header, Screen } from '@/ui';

export default function GroupDetailScreen() {
  const { t } = useTranslation('group');
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useGroup(id);
  const group = query.data;

  return (
    <Screen>
      <Header
        title={group ? t(GROUP_CONFIGS[group.kind].labels.detailTitle) : ''}
        back
        onBack={backOrHome}
        right={group ? <GroupHeaderActions group={group} /> : undefined}
      />
      <GroupDetailState query={query} configs={GROUP_CONFIGS} />
    </Screen>
  );
}
