// "Tin của tôi": hàng chip trạng thái có số (Đang đăng · Chờ duyệt (gồm bị từ chối) · Nháp · Đã đóng — số từ
// my_listing_stats, style Stitch, tràn mép) → danh sách thẻ quản lý (MyListingRow: ảnh + badge phủ, giá, lượt xem · hết
// hạn, hộp lý do chờ duyệt / bị từ chối, hàng thao tác nhanh) theo cursor, kéo xuống làm mới.
// Menu ⋮ (BottomSheet): Sửa · Gửi duyệt lại · Đánh dấu đã bán · Đóng tin · Mở lại · Gia hạn · Xoá tin — chỉ thao tác hợp lệ
// với trạng thái (DB guard vẫn quyết định); đã bán / xoá hỏi lại bằng BottomSheet có nút ghi rõ việc.
import type { MyListingsTab } from '@hp/core';
import { useMyListings } from '@hp/core/react';
import { FlashList } from '@shopify/flash-list';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Col, EmptyState, ErrorState, FilterBar, StaggerItem, useTheme } from '@/ui';
import { useMyListingTabOptions, usePostListing } from '../hooks';
import { ListingActionsSheet, MyListingRow, MyListingRowSkeleton, useMyListingActions } from './MyListingRow';

export { isMyListingsTab, MY_LISTING_TABS } from '../hooks';

export function MyListings({ initialTab = 'active' }: { initialTab?: MyListingsTab }) {
  const { t } = useTranslation('listing');
  const { space } = useTheme();
  const [tab, setTab] = useState<MyListingsTab>(initialTab);
  const tabs = useMyListingTabOptions();
  const list = useMyListings(tab);
  const post = usePostListing();
  const actions = useMyListingActions();

  let content: ReactNode;
  if (list.isLoading) {
    content = (
      <Col gap={3} className="pt-2">
        <MyListingRowSkeleton />
        <MyListingRowSkeleton />
        <MyListingRowSkeleton />
      </Col>
    );
  } else if (list.isError && list.items.length === 0) content = <ErrorState code={list.error.code} onRetry={() => void list.refetch()} />;
  else if (list.items.length === 0) {
    content = (
      <EmptyState title={t('manage.empty_title')} description={t('manage.empty_body')} action={{ label: t('list.post_cta'), onPress: post }} />
    );
  } else {
    content = (
      <FlashList
        data={list.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <StaggerItem index={index} className="pb-3">
            <MyListingRow listing={item} onMore={() => actions.onMore(item)} onAction={(a) => actions.onAction(item, a)} />
          </StaggerItem>
        )}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        onEndReachedThreshold={1.5}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        ListFooterComponent={list.isFetchingNextPage ? <MyListingRowSkeleton /> : null}
        // Chừa chỗ cho nút Đăng nổi (FAB) để hàng thao tác của thẻ cuối không bị che.
        contentContainerStyle={{ paddingTop: space[2], paddingBottom: space[8] * 3 }}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <>
      <View className="pb-2">
        <FilterBar options={tabs} value={tab} onChange={setTab} appearance="solid" bleed />
      </View>
      <View className="flex-1">{content}</View>
      <ListingActionsSheet sheet={actions.sheet} />
    </>
  );
}
