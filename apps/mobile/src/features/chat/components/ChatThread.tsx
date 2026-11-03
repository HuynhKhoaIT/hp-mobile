// Nội dung màn hội thoại: header + thẻ tin ngữ cảnh → danh sách tin đảo ngược (mới nhất ở đáy, cuộn lên tải tin cũ)
// → ô nhập + nút ảnh. Realtime (tin mới, đang gõ) qua @hp/core; mở màn / có tin mới → đánh dấu đã đọc.
// Lần đầu chat trên máy → hướng dẫn giao dịch an toàn. Tuỳ chọn: tắt thông báo, báo cáo, chặn / bỏ chặn.
// Chat nhóm (kind 'group'): tin của người khác kèm tên + avatar người gửi (useConversationMembers); tuỳ chọn chỉ còn tắt
// thông báo + báo cáo nhóm (chặn / hiện SĐT chỉ có ở chat 1-1); rỗng → "Chào cả nhóm đi!".
import type { ChatMessage } from '@hp/core';
import {
  useChatImageUrls,
  useConversation,
  useConversationMembers,
  useDiscardMessage,
  useMarkConversationRead,
  useMessages,
  useSession,
  useSetConversationMuted,
  useTyping,
} from '@hp/core/react';
import { CHAT } from '@hp/shared';
import { FlashList } from '@shopify/flash-list';
import { Ban, Bell, BellOff, Flag, MessageCircle } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { env } from '@/core/env';
import { setActiveConversation } from '@/core/notifications';
import { useBlockAction, useReportAction } from '@/core/report';
import { backOrHome } from '@/features/listing/navigation';
import { useErrorText } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { profileAvatarUrl } from '@/lib/images';
import {
  BottomSheet,
  ChatScrollView,
  Composer,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  MenuItem,
  MessageBubble,
  ReportSheet,
  Skeleton,
  Text,
  useTheme,
} from '@/ui';
import { dayKey, isGroupConversation, messageStatus, useChatSafety, useChatSender, useDayLabel } from '../hooks';
import { SafetyGuideSheet } from './SafetyGuideSheet';
import { ThreadHeader } from './ThreadHeader';

/** Tin liền nhau cùng người gửi trong 5 phút → gộp, chỉ tin cuối chuỗi hiện giờ. */
const GROUP_MS = 5 * 60_000;
/** List đảo ngược + bàn phím: vẽ trước xa hơn để không chớp trắng khi nội dung trượt theo bàn phím. */
const DRAW_DISTANCE = 1000;

export function ChatThread({ conversationId }: { conversationId: string }) {
  const { t } = useTranslation('chat');
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useSession();
  const conversation = useConversation(conversationId);
  const messages = useMessages(conversationId);
  const typing = useTyping(conversationId);
  const markRead = useMarkConversationRead();
  const muted = useSetConversationMuted();
  const discard = useDiscardMessage();
  const sender = useChatSender(conversationId);
  const dayLabel = useDayLabel();
  const safety = useChatSafety();
  const [draft, setDraft] = useState('');
  const [contentError, setContentError] = useState<string | undefined>();
  const errorText = useErrorText();
  const [optionsOpen, setOptionsOpen] = useState(false);

  const c = conversation.data;
  const isGroup = !!c && isGroupConversation(c);
  const members = useConversationMembers(conversationId, { enabled: isGroup });
  const memberById = useMemo(() => new Map((members.data ?? []).map((m) => [m.user_id, m])), [members.data]);
  const report = useReportAction(isGroup ? { type: 'group', id: c?.context_id ?? '' } : { type: 'profile', id: c?.other_user_id ?? '' });
  const block = useBlockAction({ id: c?.other_user_id, name: c?.other_name });

  // Đường dẫn ảnh của các tin đang có → signed URL (bucket riêng tư).
  const imagePaths = useMemo(() => messages.items.flatMap((m) => (m.image_path ? [m.image_path] : [])), [messages.items]);
  const images = useChatImageUrls(conversationId, imagePaths, { transform: env.imageTransform });

  // Push của hội thoại đang mở không hiện banner (tin đã hiện realtime).
  useEffect(() => {
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId]);

  // Đánh dấu đã đọc khi mở và khi tin mới nhất là của người kia.
  const newest = messages.items[0];
  useEffect(() => {
    if (!newest || newest.status) return;
    if (newest.sender_id !== userId) typing.stopTyping();
    markRead.mutate({ conversationId });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi tin mới nhất đổi
  }, [newest?.id]);

  const latestMineId = messages.items.find((m) => m.sender_id === userId)?.id;
  const blockedText = c?.blocked_by_me ? t('blocked.by_me') : c?.blocked_me ? t('blocked.by_them') : undefined;

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setContentError(undefined);
    setDraft('');
    sender.sendText(body, (code, rejected) => {
      setDraft(rejected);
      setContentError(errorText(code));
    });
  };

  if (conversation.isError && !c) {
    return (
      <View className="flex-1">
        <ThreadHeader conversation={undefined} isTyping={false} onBack={backOrHome} onOptions={() => undefined} />
        <ErrorState code={conversation.error.code} onRetry={() => void conversation.refetch()} />
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const mine = item.sender_id === userId;
    const newer = messages.items[index - 1];
    const older = messages.items[index + 1];
    const lastOfRun =
      !newer || newer.sender_id !== item.sender_id || Date.parse(newer.created_at) - Date.parse(item.created_at) > GROUP_MS;
    const newDay = !older || dayKey(older.created_at) !== dayKey(item.created_at);
    const firstOfRun =
      newDay || !older || older.sender_id !== item.sender_id || Date.parse(item.created_at) - Date.parse(older.created_at) > GROUP_MS;
    const member = isGroup && !mine && item.sender_id ? memberById.get(item.sender_id) : undefined;
    const author =
      isGroup && !mine
        ? { name: member?.display_name || t('inbox.deleted_user'), avatarUri: profileAvatarUrl(member?.avatar_url) }
        : undefined;
    const status = mine ? messageStatus(item, { latestMine: item.id === latestMineId, otherReadAt: c?.other_last_read_at ?? null }) : undefined;
    const imageUri = item.localImageUri ?? (item.image_path ? images.data?.[item.image_path] : null);

    return (
      <View className={lastOfRun ? 'pb-3' : 'pb-1'}>
        {newDay ? (
          <View className="items-center py-3">
            <Text variant="caption" tone="muted" className="rounded-full bg-surface-2 px-3 py-1">
              {dayLabel(item.created_at)}
            </Text>
          </View>
        ) : null}
        <MessageBubble
          mine={mine}
          body={item.body}
          imageUri={imageUri}
          imagePending={!!item.image_path && !imageUri}
          time={formatDate(item.created_at, 'time')}
          status={status}
          showMeta={lastOfRun || status === 'failed'}
          author={author}
          showAuthor={firstOfRun}
          showAvatar={lastOfRun}
          onRetry={() => {
            if (!sender.retry(item)) discard(conversationId, item.id);
          }}
        />
      </View>
    );
  };

  return (
    <View className="flex-1">
      <ThreadHeader conversation={c} isTyping={typing.isTyping} onBack={backOrHome} onOptions={() => setOptionsOpen(true)} />

      <View className="flex-1">
        {messages.isLoading ? (
          <ThreadSkeleton />
        ) : messages.isError && messages.items.length === 0 ? (
          <ErrorState code={messages.error.code} onRetry={() => void messages.refetch()} />
        ) : messages.items.length === 0 ? (
          <EmptyState icon={MessageCircle} title={isGroup ? t('group:chat.empty') : t('thread.start_hint')} />
        ) : (
          <FlashList
            data={messages.items}
            inverted
            renderScrollComponent={ChatScrollView}
            drawDistance={DRAW_DISTANCE}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: theme.space[4], paddingTop: theme.space[3] }}
            onEndReached={() => {
              if (messages.hasNextPage && !messages.isFetchingNextPage) void messages.fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              messages.isFetchingNextPage ? (
                <View className="items-center py-3">
                  <ActivityIndicator color={theme.colors.textMuted} />
                </View>
              ) : null
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}
      </View>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <Composer
          value={draft}
          onChangeText={(text) => {
            setDraft(text);
            if (contentError) setContentError(undefined);
            if (text) typing.notifyTyping();
          }}
          onSend={send}
          onPickImage={() => void sender.sendImage()}
          maxLength={CHAT.bodyMax}
          error={contentError}
          disabledText={blockedText}
          disabledAction={c?.blocked_by_me ? { label: t('common:block.unblock'), onPress: block.unblock } : undefined}
        />
      </KeyboardStickyView>

      <ReportSheet {...report.sheetProps} />
      <ConfirmSheet {...block.confirmProps} />
      <BottomSheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title={t('thread.options')}>
        <View className="-mx-4">
          <MenuItem
            icon={c?.muted ? Bell : BellOff}
            label={c?.muted ? t('thread.unmute') : t('thread.mute')}
            chevron={false}
            onPress={() => {
              setOptionsOpen(false);
              if (c) muted.mutate({ conversationId, muted: !c.muted });
            }}
          />
          <MenuItem
            icon={Flag}
            label={isGroup ? t('group:detail.report') : t('common:actions.report')}
            chevron={false}
            onPress={() => {
              setOptionsOpen(false);
              report.open();
            }}
          />
          {isGroup ? null : (
            <MenuItem
              icon={Ban}
              tone="danger"
              label={block.isBlocked ? t('common:block.unblock') : t('common:actions.block')}
              chevron={false}
              onPress={() => {
                setOptionsOpen(false);
                block.ask();
              }}
            />
          )}
        </View>
      </BottomSheet>
      {/* Chỉ mount khi cần: modal đã đóng nhưng còn mount vẫn chiếm stack của BottomSheetModal, chặn sheet Tuỳ chọn. */}
      {!safety.seen && c ? <SafetyGuideSheet open onAccept={safety.markSeen} /> : null}
    </View>
  );
}

function ThreadSkeleton() {
  return (
    <View className="flex-1 justify-end gap-3 px-4 pb-4">
      <Skeleton className="h-10 w-2/3 self-start rounded-xl" />
      <Skeleton className="h-10 w-1/2 self-end rounded-xl" />
      <Skeleton className="h-16 w-3/4 self-start rounded-xl" />
      <Skeleton className="h-10 w-2/5 self-end rounded-xl" />
    </View>
  );
}
