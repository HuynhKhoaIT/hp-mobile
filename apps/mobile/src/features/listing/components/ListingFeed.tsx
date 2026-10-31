// Danh sách tin cuộn vô hạn (FlashList v2, cursor) dùng chung 4 tính năng: skeleton đúng hình thẻ → rỗng có CTA
// → lỗi có Thử lại → lưới / hàng theo config.card.variant; kéo để làm mới; chân danh sách: đang tải / hết tin / thử lại.
import type { PublicListing } from '@hp/core';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import { Button, EmptyState, ErrorState, ListingCard, SERVICE, SkeletonListingCard, StaggerItem, Text, useTheme } from '@/ui';
import { openListing } from '../navigation';
import type { ListingFeatureConfig } from '../types';

export type ListingFeedProps = {
  config: ListingFeatureConfig;
  items: PublicListing[];
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
  onPost: () => void;
};

/** Số item còn lại thì tải trang tiếp (.claude/rules/mobile-performance.md). */
const PREFETCH_ITEMS = 5;

export function ListingFeed(p: ListingFeedProps) {
  const { t } = useTranslation('listing');
  const { height } = useWindowDimensions();
  const { space } = useTheme();
  const grid = p.config.card.variant === 'grid';
  const columns = grid ? 2 : 1;

  if (p.isLoading) return <SkeletonListingCard count={6} layout={p.config.card.variant} columns={columns} />;
  if (p.isError && p.items.length === 0) return <ErrorState code={p.errorCode} onRetry={p.refetch} />;
  if (p.items.length === 0) {
    return (
      <EmptyState
        icon={p.config.color ? SERVICE[p.config.color].icon : undefined}
        title={t(p.isFiltered ? 'list.empty_search_title' : 'list.empty_title')}
        description={t(p.isFiltered ? 'list.empty_search_body' : 'list.empty_body')}
        action={{ label: t('list.post_cta'), onPress: p.onPost }}
      />
    );
  }

  // FlashList v2 tự đo item (không còn estimatedItemSize): chiều cao ước lượng trong config dùng để đổi
  // "còn 5 item" thành ngưỡng onEndReached (đơn vị = chiều cao màn hình).
  const rowsLeft = Math.ceil(PREFETCH_ITEMS / columns);
  const threshold = Math.max(0.5, (rowsLeft * p.config.card.estimatedHeight) / height);
  const loadMore = () => {
    if (p.hasNextPage && !p.isFetchingNextPage && !p.isFetchNextPageError) p.fetchNextPage();
  };

  const footer = p.isFetchingNextPage ? (
    <View className="pb-3">
      <SkeletonListingCard count={columns} layout={p.config.card.variant} columns={columns} />
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
      numColumns={columns}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <StaggerItem index={index} className={grid ? (index % 2 === 0 ? 'pb-3 pr-1.5' : 'pb-3 pl-1.5') : 'pb-3'}>
          <ListingCard listing={item} layout={p.config.card.variant} onPress={() => openListing(item.id)} />
        </StaggerItem>
      )}
      onEndReached={loadMore}
      onEndReachedThreshold={threshold}
      refreshing={p.isRefetching && !p.isFetchingNextPage}
      onRefresh={p.refetch}
      ListFooterComponent={footer}
      // Chừa chỗ cho nút Đăng nổi (Fab) ở cuối danh sách.
      contentContainerStyle={{ paddingTop: space[2], paddingBottom: space[8] * 3 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    />
  );
}
