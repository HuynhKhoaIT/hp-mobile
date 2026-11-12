// Hộp thư (style Stitch "Danh sách hộp thư Chat") — phần dưới header của tab Tin nhắn và tab Chat của mini-app:
// khách → mời đăng nhập; đang tải → khung chờ thẻ hội thoại; lỗi → thử lại; rỗng → mời xem tin (`emptyAction`).
// Không khoá dịch vụ (tab Tin nhắn): hàng chip lọc tại chỗ (Tất cả · Chưa đọc có số · dịch vụ có trong hộp thư;
// useInboxFilter) → lọc không có kết quả → "Xem tất cả". Khoá một dịch vụ (`feature` — tab Chat của Chợ Pass): không chip,
// chỉ hội thoại của dịch vụ đó (useFeatureInbox). Thẻ hội thoại mới nhất trước (cursor) → hộp nhắc giao dịch an toàn
// cuối danh sách; kéo để làm mới. Bấm → màn chat (chồng lên, không thanh tab).
import { useConversations, useSession, useUnreadConversationCount } from '@hp/core/react';
import type { Feature } from '@hp/shared';
import { FlashList } from '@shopify/flash-list';
import { MessageCircle, ShieldCheck } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { EmptyState, ErrorState, FilterBar, type FilterOption, Notice, useTheme } from '@/ui';
import { type InboxFilter, openConversation, useFeatureInbox, useInboxFilter } from '../hooks';
import { ConversationRow, ConversationRowSkeleton } from './ConversationRow';

export type InboxListProps = {
  /** Khoá một dịch vụ (không chip lọc). */
  feature?: Feature;
  /** Nút của trạng thái rỗng (vd "Xem tin" → Khám phá / trang chủ mini-app). */
  emptyAction: { label: string; onPress: () => void };
  /** Khối cuối danh sách, dưới hộp nhắc an toàn (vd dòng miễn trừ của mini-app). */
  footer?: ReactNode;
};

export function InboxList({ feature, emptyAction, footer }: InboxListProps) {
  const { t } = useTranslation(['chat', 'common']);
  const theme = useTheme();
  const session = useSession();
  const list = useConversations({ enabled: !!session.userId });
  const unread = useUnreadConversationCount();
  const inbox = useInboxFilter(list);
  const locked = useFeatureInbox(list, feature);
  const visible = feature ? locked : inbox.visible;

  if (!session.isLoading && !session.userId) return <SignInPrompt />;
  if (session.isLoading || list.isLoading) {
    return (
      <View className="gap-3 pt-4">
        {Array.from({ length: 6 }, (_, i) => (
          <ConversationRowSkeleton key={i} />
        ))}
      </View>
    );
  }
  if (list.isError && list.items.length === 0) return <ErrorState code={list.error.code} onRetry={() => void list.refetch()} />;
  if (list.items.length === 0 || (feature && visible.length === 0 && !list.hasNextPage)) {
    return <EmptyState icon={MessageCircle} title={t('inbox.empty_title')} description={t('inbox.empty_body')} action={emptyAction} />;
  }

  const options: FilterOption<InboxFilter>[] = [
    { value: 'all', label: t('inbox.filter_all') },
    { value: 'unread', label: t('inbox.filter_unread'), count: unread.data ? unread.data : undefined },
    ...inbox.features.map((f) => ({ value: f, label: t(`common:feature.${f}`) })),
  ];

  return (
    <>
      {feature ? null : (
        <View className="pt-3">
          <FilterBar bleed appearance="solid" options={options} value={inbox.filter} onChange={inbox.setFilter} />
        </View>
      )}
      <FlashList
        data={visible}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <ConversationRow conversation={item} onPress={() => openConversation(item.id)} />}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingTop: theme.space[3], paddingBottom: theme.space[4] }}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching && !list.isFetchingNextPage}
            onRefresh={() => void list.refetch()}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
        ListEmptyComponent={
          list.hasNextPage || feature ? null : (
            <EmptyState
              icon={MessageCircle}
              title={t('inbox.filter_empty')}
              action={{ label: t('inbox.filter_reset'), onPress: () => inbox.setFilter('all') }}
            />
          )
        }
        ListFooterComponent={
          <View className="gap-4 pt-4">
            {list.isFetchingNextPage ? <ActivityIndicator color={theme.colors.textMuted} /> : null}
            {list.hasNextPage ? null : (
              <Notice
                variant="bordered"
                tone="warning"
                icon={ShieldCheck}
                title={t('safety.title')}
                text={`${t('safety.tip_deposit')} ${t('safety.tip_report')}`}
              />
            )}
            {list.hasNextPage ? null : footer}
          </View>
        }
      />
    </>
  );
}
