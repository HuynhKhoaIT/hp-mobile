// Danh sách nhóm cuộn vô hạn (FlashList v2, cursor "<starts_at>|<id>") dùng chung ride / sport: skeleton đúng hình
// GroupCard → rỗng có CTA tạo nhóm (đang lọc: "không có nhóm phù hợp") → lỗi có Thử lại → thẻ một cột;
// kéo để làm mới; chân danh sách: đang tải / hết / thử lại.
import type { PublicGroup } from '@hp/core';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import { Button, EmptyState, ErrorState, GroupCard, SERVICE, SkeletonGroupCard, StaggerItem, Text, useTheme } from '@/ui';
import { openGroup } from '../navigation';
import type { GroupFeatureConfig } from '../types';

export type GroupFeedProps = {
  config: GroupFeatureConfig;
  items: PublicGroup[];
  isLoading: boolean;
  isError: boolean;
  errorCode?: string;
  isFiltered: boolean;
  isRefetching: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  onCreate: () => void;
};

/** Số item còn lại thì tải trang tiếp (.claude/rules/mobile-performance.md). */
const PREFETCH_ITEMS = 5;

export function GroupFeed(p: GroupFeedProps) {
  const { t } = useTranslation('group');
  const { height } = useWindowDimensions();
  const { space } = useTheme();

  if (p.isLoading) return <SkeletonGroupCard count={4} />;
  if (p.isError && p.items.length === 0) return <ErrorState code={p.errorCode} onRetry={p.refetch} />;
  if (p.items.length === 0) {
    return (
      <EmptyState
        icon={SERVICE[p.config.color].icon}
        title={t(p.isFiltered ? 'list.empty_filter_title' : p.config.labels.emptyTitle)}
        description={t(p.isFiltered ? 'list.empty_filter_body' : p.config.labels.emptyBody)}
        action={{ label: t(p.config.labels.create), onPress: p.onCreate }}
      />
    );
  }

  // FlashList v2 tự đo item: chiều cao ước lượng trong config đổi "còn 5 item" thành ngưỡng onEndReached.
  const threshold = Math.max(0.5, (PREFETCH_ITEMS * p.config.card.estimatedHeight) / height);
  const loadMore = () => {
    if (p.hasNextPage && !p.isFetchingNextPage && !p.isFetchNextPageError) p.fetchNextPage();
  };

  const footer = p.isFetchingNextPage ? (
    <View className="pb-3">
      <SkeletonGroupCard />
    </View>
  ) : p.isFetchNextPageError ? (
    <View className="items-center py-4">
      <Button variant="outline" size="sm" label={t('list.load_more')} onPress={p.fetchNextPage} />
    </View>
  ) : !p.hasNextPage ? (
    <Text variant="caption" tone="muted" className="py-4 text-center">
      {t('list.end')}
    </Text>
  ) : null;

  return (
    <FlashList
      data={p.items}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <StaggerItem index={index} className="pb-3">
          <GroupCard group={item} onPress={() => openGroup(item.id)} />
        </StaggerItem>
      )}
      onEndReached={loadMore}
      onEndReachedThreshold={threshold}
      refreshing={p.isRefetching && !p.isFetchingNextPage}
      onRefresh={p.refetch}
      ListFooterComponent={footer}
      // Chừa chỗ cho nút Tạo nổi (Fab) ở cuối danh sách.
      contentContainerStyle={{ paddingTop: space[2], paddingBottom: space[8] * 3 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    />
  );
}
