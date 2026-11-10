// Màn kết quả sau khi tạo nhóm (khớp web): "Đã đăng chuyến!" / "Đã đăng kèo!" + Xem nhóm / Tạo nhóm khác.
// Nhóm không qua hàng chờ duyệt (lọc nội dung ở trigger) → luôn là kết quả thành công.
import type { SavedGroup } from '@hp/core';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { SERVICE, SuccessScreen } from '@/ui';
import { openCreateGroup, openGroup } from '../navigation';
import type { GroupFeatureConfig } from '../types';

export function GroupPostResult({ config, result }: { config: GroupFeatureConfig; result: SavedGroup }) {
  const { t } = useTranslation('group');
  return (
    <ScrollView className="flex-1" contentContainerClassName="grow">
      <SuccessScreen
        tone="success"
        icon={SERVICE[config.color].icon}
        title={t(config.form.successTitleKey)}
        description={t('form.success_body')}
        primary={{ label: t('form.view_group'), onPress: () => openGroup(result.id, { replace: true }) }}
        secondary={[{ label: t('form.create_another'), onPress: () => openCreateGroup(config.kind, { replace: true }) }]}
      />
    </ScrollView>
  );
}
