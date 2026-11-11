// Khối "Tin của tôi" ở tab Tôi (Stitch "Quản lý tin đăng"): tiêu đề vạch cam + "Xem tất cả" (→ màn Tin của tôi đúng tab
// đang chọn) → chip trạng thái có số chọn tại chỗ (tràn mép) → tối đa 3 thẻ quản lý của tab (MyListingRow, đủ thao tác
// nhanh + menu ⋮) → "Xem tất cả" khi còn tin. Đang tải → 2 khung chờ thẻ; rỗng → thẻ gọn có nút Đăng tin; lỗi → thử lại.
import type { MyListingsTab } from '@hp/core';
import { useMyListings } from '@hp/core/react';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { ListingActionsSheet, MyListingRow, MyListingRowSkeleton, useMyListingActions } from '@/features/listing/components/MyListingRow';
import { useMyListingTabOptions, usePostListing } from '@/features/listing/hooks';
import { openMyListings } from '@/features/listing/navigation';
import { Button, EmptyState, ErrorState, FilterBar, SectionHeader } from '@/ui';

const PREVIEW = 3;

export function MeListingsPreview() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<MyListingsTab>('active');
  const tabs = useMyListingTabOptions();
  const list = useMyListings(tab);
  const post = usePostListing();
  const actions = useMyListingActions();
  const items = list.items.slice(0, PREVIEW);
  const more = list.items.length > PREVIEW || !!list.hasNextPage;

  return (
    <View className="gap-3">
      <SectionHeader bar="accent" title={t('listing:manage.title')} action={{ label: t('home.see_all'), onPress: () => openMyListings(tab) }} />
      <FilterBar options={tabs} value={tab} onChange={setTab} appearance="solid" bleed />
      {list.isLoading ? (
        <View className="gap-3">
          <MyListingRowSkeleton />
          <MyListingRowSkeleton />
        </View>
      ) : list.isError && list.items.length === 0 ? (
        <ErrorState compact title={t('home.section_error')} code={list.error.code} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          compact
          title={t('listing:manage.empty_title')}
          description={t('listing:manage.empty_body')}
          action={{ label: t('listing:list.post_cta'), icon: Plus, onPress: post }}
        />
      ) : (
        <View className="gap-3">
          {items.map((item) => (
            <MyListingRow key={item.id} listing={item} onMore={() => actions.onMore(item)} onAction={(a) => actions.onAction(item, a)} />
          ))}
          {more ? <Button variant="ghost" fullWidth label={t('home.see_all')} onPress={() => openMyListings(tab)} /> : null}
        </View>
      )}
      <ListingActionsSheet sheet={actions.sheet} />
    </View>
  );
}
