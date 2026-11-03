// Screen type: List
// Thông báo (chuông ở header Hub, push mở app): mới nhất trước, cursor, kéo làm mới, realtime (useNotificationsRealtime
// ở providers). Chạm → đánh dấu đọc + mở màn đích (routeForNotification; kết quả duyệt huy hiệu → màn Huy hiệu). Thẻ mời bật push khi chưa cho phép.
// Khách → mời đăng nhập; rỗng / lỗi / skeleton.
import { useMarkNotificationsRead, useNotifications, useSession } from '@hp/core/react';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Bell, CheckCheck, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { openNotification } from '@/core/notifications';
import { backOrHome } from '@/features/listing/navigation';
import { badgeReview, NotificationRow, NotificationRowSkeleton } from '@/features/notifications/components/NotificationRow';
import { PushPermissionCard } from '@/features/notifications/components/PushPermissionCard';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { Divider, EmptyState, ErrorState, Header, IconButton, Screen, useTheme } from '@/ui';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const session = useSession();
  const list = useNotifications({ enabled: !!session.userId });
  const markRead = useMarkNotificationsRead();
  const hasUnread = list.items.some((n) => !n.read_at);

  return (
    <Screen edgeToEdge>
      <View className="px-4">
        <Header
          title={t('notifications.title')}
          back
          onBack={backOrHome}
          right={
            session.userId ? (
              <>
                {hasUnread ? (
                  <IconButton icon={CheckCheck} accessibilityLabel={t('notifications.mark_all_read')} onPress={() => markRead.mutate({})} />
                ) : null}
                <IconButton
                  icon={Settings}
                  accessibilityLabel={t('notifications.prefs.title')}
                  onPress={() => router.push('/settings/notifications')}
                />
              </>
            ) : undefined
          }
        />
      </View>
      {!session.isLoading && !session.userId ? (
        <View className="px-4">
          <SignInPrompt />
        </View>
      ) : session.isLoading || list.isLoading ? (
        <View>
          {Array.from({ length: 7 }, (_, i) => (
            <NotificationRowSkeleton key={i} />
          ))}
        </View>
      ) : list.isError && list.items.length === 0 ? (
        <ErrorState code={list.error.code} onRetry={() => void list.refetch()} />
      ) : (
        <FlashList
          data={list.items}
          keyExtractor={(n) => n.id}
          ListHeaderComponent={
            <View className="px-4 pb-3">
              <PushPermissionCard />
            </View>
          }
          renderItem={({ item }) => (
            <NotificationRow
              notification={item}
              onPress={() => {
                if (!item.read_at) markRead.mutate({ ids: [item.id] });
                if (badgeReview(item)) router.push('/badges');
                else openNotification(item.data, null);
              }}
            />
          )}
          ItemSeparatorComponent={() => <Divider />}
          ListEmptyComponent={
            <View className="px-4">
              <EmptyState icon={Bell} title={t('notifications.empty_title')} description={t('notifications.empty_body')} />
            </View>
          }
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={() => void list.refetch()} tintColor={theme.colors.primary} />
          }
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <View className="items-center py-4">
                <ActivityIndicator color={theme.colors.textMuted} />
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}
