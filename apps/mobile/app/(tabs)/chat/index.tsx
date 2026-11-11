// Screen type: List
// Tab Tin nhắn (style Stitch "Danh sách hộp thư Chat"): header xanh PageHero (tiêu đề + dòng phụ, hoạ tiết HeroDecor, bo đáy)
// → hàng chip lọc tại chỗ (Tất cả · Chưa đọc có số · dịch vụ có trong hộp thư; useInboxFilter) → thẻ hội thoại (mới nhất
// trước, cursor) → hộp nhắc giao dịch an toàn cuối danh sách. Realtime làm mới khi có tin (useInboxRealtime ở layout tab).
// Khách → mời đăng nhập; rỗng → mời xem tin; lọc không có kết quả → "Xem tất cả"; lỗi → thử lại; kéo để làm mới.
// Không có tìm kiếm / "Đã đọc tất cả" / chuyến đang diễn ra của Stitch: chưa có RPC tương ứng.
import { useConversations, useSession, useUnreadConversationCount } from '@hp/core/react';
import { FlashList } from '@shopify/flash-list';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MessageCircle, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { ConversationRow, ConversationRowSkeleton } from '@/features/chat/components/ConversationRow';
import { type InboxFilter, openConversation, useInboxFilter } from '@/features/chat/hooks';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { EmptyState, ErrorState, FilterBar, type FilterOption, Notice, PageHero, Screen, useScheme, useTheme } from '@/ui';

export default function ChatListScreen() {
  const { t } = useTranslation(['chat', 'common']);
  const theme = useTheme();
  const scheme = useScheme();
  const focused = useIsFocused();
  const session = useSession();
  const list = useConversations({ enabled: !!session.userId });
  const unread = useUnreadConversationCount();
  const inbox = useInboxFilter(list);

  const options: FilterOption<InboxFilter>[] = [
    { value: 'all', label: t('inbox.filter_all') },
    { value: 'unread', label: t('inbox.filter_unread'), count: unread.data ? unread.data : undefined },
    ...inbox.features.map((f) => ({ value: f, label: t(`common:feature.${f}`) })),
  ];

  return (
    <Screen tab>
      <PageHero title={t('title')} subtitle={t('inbox.subtitle')} />

      {!session.isLoading && !session.userId ? (
        <SignInPrompt />
      ) : session.isLoading || list.isLoading ? (
        <View className="gap-3 pt-4">
          {Array.from({ length: 6 }, (_, i) => (
            <ConversationRowSkeleton key={i} />
          ))}
        </View>
      ) : list.isError && list.items.length === 0 ? (
        <ErrorState code={list.error.code} onRetry={() => void list.refetch()} />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={t('inbox.empty_title')}
          description={t('inbox.empty_body')}
          action={{ label: t('inbox.empty_cta'), onPress: () => router.navigate('/explore') }}
        />
      ) : (
        <>
          <View className="pt-3">
            <FilterBar bleed appearance="solid" options={options} value={inbox.filter} onChange={inbox.setFilter} />
          </View>
          <FlashList
            data={inbox.visible}
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
              list.hasNextPage ? null : (
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
              </View>
            }
          />
        </>
      )}

      {/* Header xanh: chữ / icon thanh trạng thái tương phản với primary (sáng → chữ trắng, tối → chữ tối). */}
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}
