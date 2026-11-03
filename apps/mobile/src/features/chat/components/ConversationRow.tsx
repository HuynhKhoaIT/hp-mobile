// Một dòng hộp thư: avatar người kia · tên + giờ · tin ngữ cảnh · xem trước tin cuối + số chưa đọc · ảnh tin.
// Chưa đọc: tên + xem trước đậm, chấm số màu accent (luôn kèm số, không chỉ dựa vào màu).
// Chat nhóm (kind 'group'): ô icon màu dịch vụ (ghép xe / ghép trận) thay avatar · tên nhóm · số thành viên ·
// xem trước "Tên: tin" · không có ảnh tin.
import type { ConversationSummary } from '@hp/core';
import { unreadBadge } from '@hp/shared';
import { BellOff } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { formatRelative } from '@/lib/format';
import { listingImageUrl, profileAvatarUrl } from '@/lib/images';
import { Avatar, Icon, SERVICE, type ServiceKey, Skeleton, Text } from '@/ui';
import { isGroupConversation, usePreviewText } from '../hooks';

/** Màu / icon dịch vụ của nhóm (group_kind ride | sport); lạ → ride. */
export const groupService = (kind: string | null | undefined): Extract<ServiceKey, 'ride' | 'sport'> => (kind === 'sport' ? 'sport' : 'ride');

/** Ô icon tròn màu dịch vụ — "avatar" của chat nhóm (hộp thư, header). */
export function GroupChatIcon({ kind, size = 'md' }: { kind: string | null | undefined; size?: 'sm' | 'md' }) {
  const service = groupService(kind);
  return (
    <View className={`items-center justify-center rounded-full ${SERVICE[service].soft} ${size === 'sm' ? 'size-8' : 'size-10'}`}>
      <Icon icon={SERVICE[service].icon} service={service} size={size === 'sm' ? 16 : 'button'} />
    </View>
  );
}

export function ConversationRow({ conversation: c, onPress }: { conversation: ConversationSummary; onPress: () => void }) {
  const { t } = useTranslation(['chat', 'group']);
  const preview = usePreviewText();
  const group = isGroupConversation(c);
  const name = group ? c.group_title || t('group:chat.open') : c.other_name || t('inbox.deleted_user');
  const context = group ? t('group:chat.members', { count: c.member_count ?? 0 }) : (c.listing_title ?? t('inbox.listing_gone'));
  const unread = unreadBadge(c.unread_count);
  const when = c.last_message_at ?? c.created_at;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[name, context, preview(c), unread ? t('inbox.unread', { count: c.unread_count }) : null]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      className="min-h-20 flex-row items-center gap-3 px-4 py-3 active:bg-surface-2"
    >
      {group ? <GroupChatIcon kind={c.group_kind} /> : <Avatar uri={profileAvatarUrl(c.other_avatar_url)} name={name} size="md" />}
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <Text variant="label" weight={unread ? 'bold' : 'medium'} numberOfLines={1} className="flex-1">
            {name}
          </Text>
          {c.muted ? <Icon icon={BellOff} tone="muted" size={16} /> : null}
          <Text variant="caption" tone={unread ? 'primary' : 'muted'}>
            {formatRelative(when)}
          </Text>
        </View>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {context}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text tone={unread ? 'default' : 'muted'} weight={unread ? 'semibold' : 'regular'} numberOfLines={1} className="flex-1">
            {preview(c)}
          </Text>
          {unread ? (
            <View className="min-h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5">
              <Text variant="micro" weight="bold" tone="onAccent" maxFontSizeMultiplier={1.2}>
                {unread}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {!group && c.listing_image ? (
        <Image
          source={{ uri: listingImageUrl(c.listing_image, 'thumb') }}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityElementsHidden
          className="h-12 w-12 rounded-sm bg-surface-2"
        />
      ) : null}
    </Pressable>
  );
}

/** Skeleton đúng hình dòng hộp thư. */
export function ConversationRowSkeleton() {
  return (
    <View className="min-h-20 flex-row items-center gap-3 px-4 py-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-1/2 rounded-sm" />
        <Skeleton className="h-3 w-2/3 rounded-sm" />
        <Skeleton className="h-4 w-4/5 rounded-sm" />
      </View>
      <Skeleton className="h-12 w-12 rounded-sm" />
    </View>
  );
}
