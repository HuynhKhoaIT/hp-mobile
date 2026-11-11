// Chọn loại nhóm cần tạo (nút "Tạo nhóm" ở header Nhóm của tôi): BottomSheet liệt kê từng tính năng Group theo config
// (icon dịch vụ + "Tạo chuyến" / "Tạo kèo" + dòng phụ của danh sách) → đóng sheet rồi mở form group/new/[kind]
// (khách → đăng nhập trước, requireAuth). Thêm tính năng Group mới = thêm config, không sửa ở đây.
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { requireAuth } from '@/core/auth';
import { BottomSheet, MenuItem, SERVICE } from '@/ui';
import { openCreateGroup } from '../navigation';
import type { GroupFeatureConfig } from '../types';

export function CreateGroupSheet({
  open,
  onClose,
  configs,
}: {
  open: boolean;
  onClose: () => void;
  configs: readonly GroupFeatureConfig[];
}) {
  const { t } = useTranslation('group');

  return (
    <BottomSheet open={open} onClose={onClose} title={t('mine.create')}>
      <View className="-mx-4">
        {configs.map((config) => (
          <MenuItem
            key={config.kind}
            icon={SERVICE[config.color].icon}
            iconBox
            label={t(config.labels.create)}
            description={t(config.labels.subtitle)}
            onPress={() => {
              onClose();
              requireAuth(() => openCreateGroup(config.kind));
            }}
          />
        ))}
      </View>
    </BottomSheet>
  );
}
