// Header màn hội thoại: quay lại · avatar + tên (dòng phụ "Đang nhập…" khi người kia gõ) · nút tuỳ chọn.
// Dưới đó: thẻ tin ngữ cảnh (ảnh, tiêu đề, giá, nhãn đã bán / ẩn) → chạm mở tin.
// Chat nhóm: ô icon dịch vụ + tên nhóm + "N thành viên" (hoặc "Đang nhập…") → chạm mở chi tiết nhóm; dưới đó dải ngữ
// cảnh nhóm (giờ hẹn + trạng thái + "Xem nhóm").
import type { ConversationSummary } from '@hp/core';
import { groupDisplayStatus } from '@hp/shared';
import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, Clock, EllipsisVertical, Package } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { openGroup } from '@/features/group/navigation';
import { openListing } from '@/features/listing/navigation';
import { openProfile } from '@/features/profile/navigation';
import { formatDate, formatRelative } from '@/lib/format';
import { listingImageUrl, profileAvatarUrl } from '@/lib/images';
import { usePriceText } from '@/lib/listing';
import { Avatar, Badge, GROUP_STATUS_TONE, Icon, IconButton, Skeleton, Text, useGroupTexts } from '@/ui';
import { isGroupConversation } from '../hooks';
import { GroupChatIcon } from './ConversationRow';

export function ThreadHeader({
  conversation: c,
  isTyping,
  onBack,
  onOptions,
}: {
  conversation: ConversationSummary | undefined;
  isTyping: boolean;
  onBack: () => void;
  onOptions: () => void;
}) {
  const { t } = useTranslation(['chat', 'common', 'group']);
  const group = !!c && isGroupConversation(c);
  const name = c ? (group ? c.group_title || t('group:chat.open') : c.other_name || t('inbox.deleted_user')) : '';
  const subtitle = isTyping ? t('thread.typing') : group && c ? t('group:chat.members', { count: c.member_count ?? 0 }) : null;
  const target = group ? c?.context_id : c?.other_user_id;

  return (
    <View className="border-b border-border bg-bg">
      <View className="min-h-14 flex-row items-center gap-2">
        <IconButton icon={ChevronLeft} accessibilityLabel={t('common:actions.back')} onPress={onBack} />
        {c ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={[name, subtitle, group ? t('group:chat.view_group') : t('common:profile.view')].filter(Boolean).join(', ')}
              disabled={!target}
              onPress={() => {
                if (!target) return;
                if (group) openGroup(target);
                else openProfile(target);
              }}
              className="flex-1 flex-row items-center gap-2 active:opacity-70"
            >
              {group ? <GroupChatIcon kind={c.group_kind} size="sm" /> : <Avatar uri={profileAvatarUrl(c.other_avatar_url)} name={name} size="sm" />}
              <View className="flex-1">
                <Text variant="title" accessibilityRole="header" numberOfLines={1}>
                  {name}
                </Text>
                {subtitle ? (
                  <Text variant="caption" tone={isTyping ? 'primary' : 'muted'} numberOfLines={1} accessibilityLiveRegion="polite">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </Pressable>
            <IconButton icon={EllipsisVertical} accessibilityLabel={t('thread.options')} onPress={onOptions} />
          </>
        ) : (
          <View className="flex-1 flex-row items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-32 rounded-sm" />
          </View>
        )}
      </View>
      {c?.context_type === 'listing' ? <ListingContext conversation={c} /> : null}
      {c && group && c.group_starts_at ? <GroupContext conversation={c} /> : null}
    </View>
  );
}

function ListingContext({ conversation: c }: { conversation: ConversationSummary }) {
  const { t } = useTranslation(['chat', 'common']);
  const price = usePriceText();
  const gone = !c.listing_title;
  const inactive = c.listing_status && c.listing_status !== 'active';
  const priceText =
    c.listing_category && !c.listing_category.startsWith('job_') && c.listing_price_type
      ? price({
          category: c.listing_category as Parameters<typeof price>[0]['category'],
          price: c.listing_price,
          price_type: c.listing_price_type as Parameters<typeof price>[0]['price_type'],
          attributes: {},
        })
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={gone ? t('inbox.listing_gone') : `${t('thread.view_listing')}: ${c.listing_title}`}
      disabled={gone || !c.context_id}
      onPress={() => c.context_id && openListing(c.context_id)}
      className="mx-4 mb-3 flex-row items-center gap-3 rounded-md bg-surface p-2 shadow-card active:opacity-80"
    >
      {c.listing_image ? (
        <Image
          source={{ uri: listingImageUrl(c.listing_image, 'thumb') }}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityElementsHidden
          className="h-12 w-12 rounded-sm bg-surface-2"
        />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-sm bg-surface-2">
          <Icon icon={Package} tone="muted" />
        </View>
      )}
      <View className="flex-1 gap-0.5">
        <Text variant="label" numberOfLines={1} tone={gone ? 'muted' : 'default'}>
          {c.listing_title ?? t('inbox.listing_gone')}
        </Text>
        <View className="flex-row flex-wrap items-center gap-x-2">
          {priceText ? (
            <Text variant="caption" weight="bold">
              {priceText}
            </Text>
          ) : null}
          {inactive && c.listing_status ? <Badge label={t(`common:status.${c.listing_status}`)} tone="neutral" /> : null}
        </View>
      </View>
      {gone ? null : <Icon icon={ChevronRight} tone="muted" />}
    </Pressable>
  );
}

/** Dải ngữ cảnh chat nhóm: giờ hẹn (ngày giờ · còn bao lâu) + trạng thái nhóm → chạm mở chi tiết nhóm. */
function GroupContext({ conversation: c }: { conversation: ConversationSummary }) {
  const { t } = useTranslation('group');
  const texts = useGroupTexts();
  const source = { status: c.group_status, starts_at: c.group_starts_at };
  const status = groupDisplayStatus(source);
  const time = `${formatDate(c.group_starts_at, 'datetime')} · ${formatRelative(c.group_starts_at)}`;
  const label = texts.status(source);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[t('chat.view_group'), time, label].join(', ')}
      disabled={!c.context_id}
      onPress={() => c.context_id && openGroup(c.context_id)}
      className="mx-4 mb-3 min-h-12 flex-row items-center gap-2 rounded-md bg-surface px-3 py-2 shadow-card active:opacity-80"
    >
      <Icon icon={Clock} tone="muted" size={16} />
      <Text variant="caption" numberOfLines={1} className="flex-1">
        {time}
      </Text>
      <Badge label={label} tone={GROUP_STATUS_TONE[status]} numberOfLines={1} />
      <Icon icon={ChevronRight} tone="muted" />
    </Pressable>
  );
}
