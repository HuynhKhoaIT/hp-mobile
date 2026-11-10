// Screen type: List
// Tab Tin nhắn: hộp thư (mới nhất trước, cursor), realtime làm mới khi có tin (useInboxRealtime ở layout tab).
// Khách → mời đăng nhập; rỗng → mời xem tin; lỗi → thử lại; kéo để làm mới.
import { useConversations, useSession } from '@hp/core/react';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { ConversationRow, ConversationRowSkeleton } from '@/features/chat/components/ConversationRow';
import { openConversation } from '@/features/chat/hooks';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { Divider, EmptyState, ErrorState, Screen, Text, useTheme } from '@/ui';

export default function ChatListScreen() {
  const { t } = useTranslation('chat');
  const theme = useTheme();
  const session = useSession();
  const list = useConversations({ enabled: !!session.userId });

  return (
    <Screen tab edgeToEdge>
      <Text variant="heading" accessibilityRole="header" className="px-4 pb-3 pt-4">
        {t('title')}
      </Text>
      {!session.isLoading && !session.userId ? (
        <View className="px-4">
          <SignInPrompt />
        </View>
      ) : session.isLoading || list.isLoading ? (
        <View>
          {Array.from({ length: 6 }, (_, i) => (
            <ConversationRowSkeleton key={i} />
          ))}
        </View>
      ) : list.isError && list.items.length === 0 ? (
        <ErrorState code={list.error.code} onRetry={() => void list.refetch()} />
      ) : list.items.length === 0 ? (
        <View className="px-4">
          <EmptyState
            icon={MessageCircle}
            title={t('inbox.empty_title')}
            description={t('inbox.empty_body')}
            action={{ label: t('inbox.empty_cta'), onPress: () => router.navigate('/explore') }}
          />
        </View>
      ) : (
        <FlashList
          data={list.items}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ConversationRow conversation={item} onPress={() => openConversation(item.id)} />}
          ItemSeparatorComponent={() => (
            <View className="pl-16">
              <Divider />
            </View>
          )}
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
