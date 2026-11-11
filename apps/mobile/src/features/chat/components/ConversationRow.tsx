// Một dòng hộp thư (style Stitch "Danh sách hộp thư Chat"): thẻ rounded-lg viền border + shadow-card, p-3.
//   avatar người kia (dấu xác minh xanh góc dưới phải khi có huy hiệu) · tên + giờ (· chuông tắt khi đã tắt thông báo)
//   · dòng ngữ cảnh: ô icon dịch vụ nhỏ + "tiêu đề tin · giá" (tin đã gỡ → "Tin không còn hiển thị")
//   · xem trước tin cuối + số chưa đọc.
// Chưa đọc: viền primary/30, tên + xem trước đậm, giờ màu primary, chấm số nền accent (luôn kèm số, không chỉ dựa vào màu).
// Chat nhóm (kind 'group'): ô icon màu dịch vụ (ghép xe / ghép trận) thay avatar · tên nhóm · "giờ hẹn · N thành viên" ·
// xem trước "Tên: tin". Không có ảnh tin (ảnh nằm ở thẻ ngữ cảnh trong màn hội thoại).
import type { ConversationSummary } from '@hp/core';
import { unreadBadge } from '@hp/shared';
import { BadgeCheck, BellOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { formatDate, formatRelative } from '@/lib/format';
import { profileAvatarUrl } from '@/lib/images';
import { Avatar, Icon, SERVICE, type ServiceKey, Skeleton, Text } from '@/ui';
import { conversationFeature, isGroupConversation, useConversationPrice, usePreviewText } from '../hooks';

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

/** Dấu xác minh nhỏ góc dưới phải avatar (giống OwnerCard ở chi tiết tin). */
export function VerifiedDot() {
  return (
    <View className="absolute -bottom-1 -right-1 rounded-full bg-surface p-0.5">
      <Icon icon={BadgeCheck} tone="success" size={16} />
    </View>
  );
}

export function ConversationRow({ conversation: c, onPress }: { conversation: ConversationSummary; onPress: () => void }) {
  const { t } = useTranslation(['chat', 'group', 'common']);
  const preview = usePreviewText();
  const price = useConversationPrice();
  const group = isGroupConversation(c);
  const feature = conversationFeature(c);
  const name = group ? c.group_title || t('group:chat.open') : c.other_name || t('inbox.deleted_user');
  const verified = !group && (c.other_badges?.length ?? 0) > 0;
  const context = group
    ? [c.group_starts_at ? formatDate(c.group_starts_at, 'datetime') : null, t('group:chat.members', { count: c.member_count ?? 0 })]
        .filter(Boolean)
        .join(' · ')
    : c.listing_title
      ? [c.listing_title, price(c)].filter(Boolean).join(' · ')
      : t('inbox.listing_gone');
  const unread = unreadBadge(c.unread_count);
  const when = c.last_message_at ?? c.created_at;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        name,
        verified ? t('common:profile.verified') : null,
        context,
        preview(c),
        unread ? t('inbox.unread', { count: c.unread_count }) : null,
        c.muted ? t('inbox.muted') : null,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      className={[
        'min-h-20 flex-row items-center gap-3 rounded-lg border bg-surface p-3 shadow-card active:bg-surface-2',
        unread ? 'border-primary/30' : 'border-border',
      ].join(' ')}
    >
      <View>
        {group ? <GroupChatIcon kind={c.group_kind} /> : <Avatar uri={profileAvatarUrl(c.other_avatar_url)} name={name} size="md" />}
        {verified ? <VerifiedDot /> : null}
      </View>
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text variant="label" weight={unread ? 'bold' : 'semibold'} numberOfLines={1} className="flex-1">
            {name}
          </Text>
          {c.muted ? <Icon icon={BellOff} tone="muted" size={16} /> : null}
          <Text variant="caption" tone={unread ? 'primary' : 'muted'} weight={unread ? 'semibold' : undefined}>
            {formatRelative(when)}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          {feature ? (
            <View className={`size-6 items-center justify-center rounded-full ${SERVICE[feature].soft}`}>
              <Icon icon={SERVICE[feature].icon} service={feature} size={14} />
            </View>
          ) : null}
          <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
            {context}
          </Text>
        </View>
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
    </Pressable>
  );
}

/** Skeleton đúng hình thẻ hộp thư. */
export function ConversationRowSkeleton() {
  return (
    <View className="min-h-20 flex-row items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-1/2 rounded-sm" />
        <Skeleton className="h-3 w-2/3 rounded-sm" />
        <Skeleton className="h-4 w-4/5 rounded-sm" />
      </View>
    </View>
  );
}
