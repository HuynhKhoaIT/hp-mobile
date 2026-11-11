// Tab "Quản lý tin" của mini-app (style Stitch "Quản lý tin đăng"): header (← trang chủ mini-app, dòng nhỏ tên mini-app,
// "Quản lý tin đăng" + viên cam "{n} tin đang bán") cố định; phần cuộn: thẻ hồ sơ (avatar, tên, huy hiệu xác minh, điểm
// đánh giá — useMyProfile) + 3 số liệu (tin hiển thị · đã thanh lý · lượt xem — useFeatureListingsSummary) + mẹo đăng giờ
// tan ca → tab vòng đời có số (Đang bán · Đã bán · Chờ duyệt (gồm bị từ chối) · Đã ẩn (rút tin, hết hạn, nháp) —
// FEATURE_LISTINGS_TABS) → ô tìm theo tên / mã tin + sắp xếp (Mới nhất / Nhiều lượt xem) — lọc + sắp tại chỗ trên các tin
// đã tải → thẻ tin (MiniManageRow) theo cursor, kéo xuống làm mới. Thao tác + xác nhận (Đã bán, Xoá…) dùng chung engine
// "Tin của tôi" (useMyListingActions / ListingActionsSheet — mutation lạc quan ở @hp/core).
// Khách → mời đăng nhập; đang tải → khung chờ thẻ; lỗi → thử lại; tab rỗng → lời theo tab + "Đăng tin".
// Khác Stitch (cố ý): không "Phản hồi chat 98%", số chat / gọi trên thẻ, "Đẩy tin", "Gửi nhóm Zalo", khối "Tiện ích hỗ trợ
// thợ bán nhanh" (đẩy tin ca kíp, in mã QR) và nút hoá đơn / hỗ trợ trên header — chưa có dữ liệu / dịch vụ.
import { FEATURE_LISTINGS_TABS, type FeatureListingsTab, type MyListing } from '@hp/core';
import { useFeatureListings, useFeatureListingsSummary, useMyProfile, useSession } from '@hp/core/react';
import { FlashList } from '@shopify/flash-list';
import { Package, Star, Zap } from 'lucide-react-native';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { formatNumber } from '@/lib/format';
import { profileAvatarUrl } from '@/lib/images';
import {
  Avatar,
  Badge,
  Card,
  Col,
  EmptyState,
  ErrorState,
  FilterBar,
  Icon,
  Notice,
  SearchBar,
  Select,
  Skeleton,
  StaggerItem,
  StatColumns,
  Text,
  useTheme,
} from '@/ui';
import { usePostListing } from '../../hooks';
import { useMiniApp } from '../../miniApp';
import { ListingActionsSheet, MyListingRowSkeleton, useMyListingActions } from '../MyListingRow';
import { MiniManageRow } from './MiniManageRow';
import { MiniTabHeader } from './MiniHeader';

type ManageSort = 'newest' | 'views';

/** Lọc theo tên / mã tin + sắp xếp tại chỗ trên các tin đã tải (danh sách theo updated_at mới trước). */
function visibleRows(items: MyListing[], query: string, sort: ManageSort) {
  const q = query.trim().toLowerCase();
  const rows = q ? items.filter((l) => l.title.toLowerCase().includes(q) || String(l.short_id).toLowerCase().includes(q)) : items;
  return sort === 'views' ? [...rows].sort((a, b) => b.view_count - a.view_count) : rows;
}

export function MiniManage() {
  const { t } = useTranslation('listing');
  const { config } = useMiniApp();
  const session = useSession();
  const signedIn = !!session.userId;
  const summary = useFeatureListingsSummary(config.categories, { enabled: signedIn });
  const active = summary.data?.active;

  let body: ReactNode;
  if (session.isLoading) {
    body = (
      <Col gap={3} className="pt-4">
        <MyListingRowSkeleton />
        <MyListingRowSkeleton />
      </Col>
    );
  } else if (!signedIn) body = <SignInPrompt description={t('mini_app.manage.signed_out_body')} />;
  else body = <ManageList summary={summary} />;

  return (
    <>
      <MiniTabHeader
        eyebrow={t(config.miniApp.titleKey)}
        title={t('mini_app.manage.title')}
        badge={signedIn && active !== undefined ? t('mini_app.manage.active_count', { count: active }) : undefined}
      />
      {body}
    </>
  );
}

function ManageList({ summary }: { summary: ReturnType<typeof useFeatureListingsSummary> }) {
  const { t } = useTranslation('listing');
  const { space } = useTheme();
  const { config, sites } = useMiniApp();
  const [tab, setTab] = useState<FeatureListingsTab>('active');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ManageSort>('newest');
  const list = useFeatureListings(config.categories, tab);
  const actions = useMyListingActions();
  const post = usePostListing(config.key);
  const rows = useMemo(() => visibleRows(list.items, query, sort), [list.items, query, sort]);
  const siteName = (code: string | null) => (code ? (sites.find((s) => s.code === code)?.name ?? null) : null);

  const header = (
    <View className="gap-4 pb-3">
      <ProfileCard summary={summary} />
      {/* Không tràn mép: nằm trong FlashList (ScrollView cắt phần -mx-4). */}
      <FilterBar
        appearance="solid"
        value={tab}
        onChange={setTab}
        options={FEATURE_LISTINGS_TABS.map((value) => ({
          value,
          label: t(`mini_app.manage.tab_${value}`),
          count: summary.data?.[value],
        }))}
      />
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <SearchBar value={query} onChangeText={setQuery} onSubmit={setQuery} placeholder={t('mini_app.manage.search_placeholder')} />
        </View>
        <Select
          trigger="chip"
          label={t('sort.label')}
          value={sort}
          neutralValue="newest"
          options={[
            { value: 'newest', label: t('sort.newest') },
            { value: 'views', label: t('mini_app.manage.sort_views') },
          ]}
          onChange={setSort}
        />
      </View>
    </View>
  );

  const state: ReactNode = list.isLoading ? (
    <Col gap={3}>
      <MyListingRowSkeleton />
      <MyListingRowSkeleton />
    </Col>
  ) : list.isError && list.items.length === 0 ? (
    <ErrorState code={list.error.code} onRetry={() => void list.refetch()} />
  ) : rows.length === 0 && !list.hasNextPage ? (
    <EmptyState
      icon={Package}
      title={t(`mini_app.manage.empty_${tab}_title`)}
      description={t(`mini_app.manage.empty_${tab}_body`)}
      action={{ label: t('list.post_cta'), onPress: post }}
    />
  ) : null;

  return (
    <>
      <FlashList
        data={state ? [] : rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <StaggerItem index={index} className="pb-3">
            <MiniManageRow
              listing={item}
              tab={tab}
              siteName={siteName(item.site)}
              onMore={() => actions.onMore(item)}
              onAction={(a) => actions.onAction(item, a)}
            />
          </StaggerItem>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={state ? <View>{state}</View> : null}
        ListFooterComponent={list.isFetchingNextPage ? <MyListingRowSkeleton /> : null}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        onEndReachedThreshold={1.5}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => {
          void list.refetch();
          void summary.refetch();
        }}
        contentContainerStyle={{ paddingTop: space[4], paddingBottom: space[8] }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
      <ListingActionsSheet sheet={actions.sheet} />
    </>
  );
}

/** Thẻ hồ sơ: avatar + tên + huy hiệu + đánh giá → 3 số liệu của tính năng → mẹo đăng tin. */
function ProfileCard({ summary }: { summary: ReturnType<typeof useFeatureListingsSummary> }) {
  const { t, i18n } = useTranslation('listing');
  const me = useMyProfile();
  const profile = me.data;
  const badges = (profile?.badges ?? []).filter((b) => i18n.exists(`listing:owner_badge.${b}`));
  const s = summary.data;

  return (
    <Card className="gap-4">
      {profile ? (
        <View className="flex-row items-center gap-3">
          <Avatar uri={profileAvatarUrl(profile.avatar_url)} name={profile.full_name || '?'} size="lg" />
          <View className="flex-1 gap-1">
            <Text variant="title" weight="bold" accessibilityRole="header">
              {profile.full_name || '?'}
            </Text>
            {badges.length > 0 ? (
              <View className="flex-row flex-wrap gap-1">
                {badges.map((b) => (
                  <Badge key={b} tone="primary" label={t(`owner_badge.${b}`)} />
                ))}
              </View>
            ) : null}
            {profile.rating_count > 0 ? (
              <View className="flex-row items-center gap-1">
                <Icon icon={Star} tone="accent" size={16} filled />
                <Text variant="caption" weight="semibold">
                  {t('common:profile.rating', { avg: formatNumber(Math.round(profile.rating_avg * 10) / 10), count: profile.rating_count })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : (
        <View className="flex-row items-center gap-3">
          <Skeleton className="size-16 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </View>
        </View>
      )}

      {summary.isLoading ? (
        <View className="flex-row gap-3">
          <Skeleton className="h-14 flex-1" />
          <Skeleton className="h-14 flex-1" />
          <Skeleton className="h-14 flex-1" />
        </View>
      ) : s ? (
        <StatColumns
          size="md"
          className="rounded-lg bg-surface-2 py-3"
          items={[
            { value: formatNumber(s.active), label: t('mini_app.manage.stat_active'), tone: 'primary' },
            { value: formatNumber(s.sold), label: t('mini_app.manage.stat_sold') },
            { value: formatNumber(s.views), label: t('mini_app.manage.stat_views'), tone: 'primary' },
          ]}
        />
      ) : (
        <ErrorState compact code={summary.error?.code} onRetry={() => void summary.refetch()} />
      )}

      <Notice tone="warning" icon={Zap} text={t('mini_app.manage.tip')} />
    </Card>
  );
}
