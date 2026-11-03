// Dải ngang nhóm sắp diễn ra của một tính năng Group (tab Khám phá): tiêu đề có ô icon màu dịch vụ + "Xem tất cả"
// (→ groups/[kind]) → tối đa RAIL_SIZE GroupCard rộng w-72 cuộn ngang. Dùng chung cache với màn danh sách (cùng
// useGroupList({ kind })). Đang tải → 2 thẻ chờ; lỗi → ErrorState gọn; rỗng → ẩn cả dải.
// Ít item → ScrollView ngang (không lồng list cùng chiều trong FlashList dọc của Khám phá).
import { useGroupList } from '@hp/core/react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { ErrorState, GroupCard, SectionHeader, SkeletonGroupCard } from '@/ui';
import { openGroup, openGroupList } from '../navigation';
import type { GroupFeatureConfig } from '../types';

/** Số thẻ trong dải (xem thêm ở danh sách đầy đủ). */
const RAIL_SIZE = 6;

export function GroupRail({ config }: { config: GroupFeatureConfig }) {
  const { t } = useTranslation(['group', 'common']);
  const list = useGroupList({ kind: config.kind });
  const items = list.items.slice(0, RAIL_SIZE);
  if (!list.isLoading && !list.isError && items.length === 0) return null;
  const title = t(config.labels.title);

  return (
    <View className="gap-3">
      <SectionHeader
        title={title}
        icon={{ service: config.color }}
        chevron
        action={
          items.length > 0
            ? { label: t('common:home.see_all'), accessibilityLabel: `${t('common:home.see_all')}: ${title}`, onPress: () => openGroupList(config.kind) }
            : undefined
        }
      />
      {list.isLoading ? (
        <View className="-mx-4 flex-row gap-3 overflow-hidden px-4">
          {[0, 1].map((i) => (
            <View key={i} className="w-72">
              <SkeletonGroupCard />
            </View>
          ))}
        </View>
      ) : list.isError ? (
        <ErrorState compact title={t('common:home.section_error')} code={list.error.code} onRetry={() => void list.refetch()} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4" contentContainerClassName="items-start gap-3 px-4 pb-2 pt-1">
          {items.map((g) => (
            <GroupCard key={g.id} group={g} className="w-72" onPress={() => openGroup(g.id)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
