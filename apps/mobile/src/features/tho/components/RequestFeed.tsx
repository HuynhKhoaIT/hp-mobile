// Danh sách yêu cầu cuộn vô hạn (FlashList v2, cursor "<created_at>|<id>") — "Việc quanh bạn", "Yêu cầu của tôi", "Báo giá
// của tôi": skeleton đúng hình RequestCard → rỗng có CTA (đang lọc: "không có yêu cầu phù hợp") → lỗi có Thử lại → thẻ một
// cột; kéo để làm mới; chân danh sách: đang tải / hết / thử lại. `header`: khối cuộn cùng danh sách trên thẻ đầu.
import { FlashList } from '@shopify/flash-list';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import { Button, EmptyState, ErrorState, StaggerItem, Text, useTheme } from '@/ui';
import { SkeletonRequestCard } from './RequestCard';

export type RequestFeedProps<T> = {
  items: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  isLoading: boolean;
  isError: boolean;
  errorCode?: string;
  isRefetching: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  empty: { icon: LucideIcon; title: string; description: string; action?: { label: string; onPress: () => void } };
  /** Khối cuộn cùng danh sách, trên thẻ đầu tiên. */
  header?: ReactNode;
};

/** Số item còn lại thì tải trang tiếp (.claude/rules/mobile-performance.md); thẻ yêu cầu cao ~190. */
const PREFETCH_ITEMS = 5;
const ESTIMATED_HEIGHT = 190;

export function RequestFeed<T>(p: RequestFeedProps<T>) {
  const { t } = useTranslation('tho');
  const { height } = useWindowDimensions();
  const { space } = useTheme();

  if (p.isLoading) return <SkeletonRequestCard count={4} />;
  if (p.isError && p.items.length === 0) return <ErrorState code={p.errorCode} onRetry={p.refetch} />;
  if (p.items.length === 0) return <EmptyState icon={p.empty.icon} title={p.empty.title} description={p.empty.description} action={p.empty.action} />;

  const threshold = Math.max(0.5, (PREFETCH_ITEMS * ESTIMATED_HEIGHT) / height);
  const loadMore = () => {
    if (p.hasNextPage && !p.isFetchingNextPage && !p.isFetchNextPageError) p.fetchNextPage();
  };

  const footer = p.isFetchingNextPage ? (
    <View className="pb-3">
      <SkeletonRequestCard />
    </View>
  ) : p.isFetchNextPageError ? (
    <View className="items-center py-4">
      <Button variant="outline" size="sm" label={t('list.empty_cta')} onPress={p.fetchNextPage} />
    </View>
  ) : !p.hasNextPage ? (
    <Text variant="caption" tone="muted" className="py-4 text-center">
      {t('list.end')}
    </Text>
  ) : null;

  return (
    <FlashList
      data={p.items}
      keyExtractor={p.keyOf}
      renderItem={({ item, index }) => (
        <StaggerItem index={index} className="pb-3">
          {p.renderItem(item)}
        </StaggerItem>
      )}
      ListHeaderComponent={p.header ? <View className="pb-3">{p.header}</View> : null}
      ListFooterComponent={footer}
      onEndReached={loadMore}
      onEndReachedThreshold={threshold}
      refreshing={p.isRefetching && !p.isFetchingNextPage}
      onRefresh={p.refetch}
      contentContainerStyle={{ paddingTop: space[3], paddingBottom: space[6] }}
      showsVerticalScrollIndicator={false}
    />
  );
}
