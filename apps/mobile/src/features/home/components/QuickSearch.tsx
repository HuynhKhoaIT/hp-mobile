// "Tìm nhanh" (§4.6, §10): tiêu đề khối text-lg 600 + hàng chip cuộn ngang (gap-2, mép 16) từ HOME_SHORTCUTS.
// Chip cao 40 nền surface viền border, chấm màu dịch vụ size-2 trước chữ. Bấm → danh sách của tính năng với bộ lọc
// đặt sẵn (params `shortcut` của màn List) + event home_shortcut_click.
import { HOME_SHORTCUTS } from '@hp/shared';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { track } from '@/core/analytics';
import { Chip, SectionHeader } from '@/ui';
import { openShortcut } from '../navigation';

export function QuickSearch() {
  const { t } = useTranslation();
  return (
    <View className="gap-3">
      <SectionHeader className="px-4" title={t('home.shortcuts_title')} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Chừa 4 trên / dưới cho vùng chạm mở rộng (hitSlop) của chip không bị cắt.
        contentContainerClassName="gap-2 px-4 py-1"
      >
        {HOME_SHORTCUTS.map((s) => (
          <Chip
            key={s.id}
            size="sm"
            dot={s.feature}
            label={t(`home.shortcut.${s.id}`)}
            onPress={() => {
              track('home_shortcut_click', { shortcut: s.id });
              openShortcut(s);
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}
