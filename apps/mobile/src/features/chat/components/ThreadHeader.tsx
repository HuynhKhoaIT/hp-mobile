// Header màn hội thoại (style Stitch "Khung Chat trực tiếp"): dải xanh primary tràn lên vùng trạng thái + hoạ tiết
// HeroDecor — nút quay lại trong mờ · avatar viền on-primary/30 (dấu xác minh khi có huy hiệu) + tên đậm (dòng phụ
// "Đang nhập…" khi người kia gõ, "Đã xác minh" khi có huy hiệu) → chạm mở hồ sơ · nút tuỳ chọn trong mờ.
// Dưới đó, trên nền surface: thẻ tin ngữ cảnh (ảnh, tiêu đề, giá, nhãn đã bán / ẩn, "Xem tin") → chạm mở tin.
// Chat nhóm: ô icon dịch vụ + tên nhóm + "N thành viên" (hoặc "Đang nhập…") → chạm mở chi tiết nhóm; thẻ ngữ cảnh nhóm
// (ô icon dịch vụ · giờ hẹn · còn bao lâu · trạng thái · "Xem nhóm").
// Không có nút gọi điện / vị trí xe / đặt chỗ của Stitch: chat không có các tính năng đó.
import type { ConversationSummary } from '@hp/core';
import { groupDisplayStatus } from '@hp/shared';
import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, EllipsisVertical, Package } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { openGroup } from '@/features/group/navigation';
import { type MiniSlug, openListing } from '@/features/listing/navigation';
import { openProfile } from '@/features/profile/navigation';
import { formatDate, formatRelative } from '@/lib/format';
import { listingImageUrl, profileAvatarUrl } from '@/lib/images';
import { Avatar, Badge, GROUP_STATUS_TONE, HeroDecor, Icon, IconButton, SERVICE, Text, useGroupTexts } from '@/ui';
import { isGroupConversation, useConversationPrice } from '../hooks';
import { groupService, VerifiedDot } from './ConversationRow';

export function ThreadHeader({
  conversation: c,
  isTyping,
  onBack,
  onOptions,
  mini,
}: {
  conversation: ConversationSummary | undefined;
  isTyping: boolean;
  onBack: () => void;
  onOptions: () => void;
  /** Mở từ mini-app → "Xem tin" mở chi tiết trong mini-app. */
  mini?: MiniSlug;
}) {
  const { t } = useTranslation(['chat', 'common', 'group']);
  const group = !!c && isGroupConversation(c);
  const name = c ? (group ? c.group_title || t('group:chat.open') : c.other_name || t('inbox.deleted_user')) : '';
  const verified = !!c && !group && (c.other_badges?.length ?? 0) > 0;
  const subtitle = isTyping
    ? t('thread.typing')
    : group && c
      ? t('group:chat.members', { count: c.member_count ?? 0 })
      : verified
        ? t('common:profile.verified')
        : null;
  const target = group ? c?.context_id : c?.other_user_id;

  return (
    <View className="z-10">
      <View className="bg-primary px-2 pb-2 pt-1 shadow-card">
        <HeroDecor />
        <View className="min-h-14 flex-row items-center gap-2">
          <IconButton icon={ChevronLeft} variant="glass" accessibilityLabel={t('common:actions.back')} onPress={onBack} />
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
                className="min-h-12 flex-1 flex-row items-center gap-2.5 active:opacity-70"
              >
                <View>
                  <View className="rounded-full border-2 border-on-primary/30">
                    {group ? (
                      <GroupHeaderIcon kind={c.group_kind} />
                    ) : (
                      <Avatar uri={profileAvatarUrl(c.other_avatar_url)} name={name} size="md" />
                    )}
                  </View>
                  {verified ? <VerifiedDot /> : null}
                </View>
                <View className="flex-1">
                  <Text variant="title" weight="bold" tone="onPrimary" accessibilityRole="header" numberOfLines={1}>
                    {name}
                  </Text>
                  {subtitle ? (
                    <Text
                      variant="caption"
                      tone="onPrimary"
                      weight={isTyping ? 'semibold' : undefined}
                      numberOfLines={1}
                      accessibilityLiveRegion="polite"
                      className="opacity-90"
                    >
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
              <IconButton icon={EllipsisVertical} variant="glass" accessibilityLabel={t('thread.options')} onPress={onOptions} />
            </>
          ) : (
            <View className="flex-1 flex-row items-center gap-2.5">
              <View className="size-11 rounded-full bg-on-primary/15" />
              <View className="h-5 w-32 rounded-full bg-on-primary/15" />
            </View>
          )}
        </View>
      </View>
      {c?.context_type === 'listing' ? <ListingContext conversation={c} mini={mini} /> : null}
      {c && group && c.group_starts_at ? <GroupContext conversation={c} /> : null}
    </View>
  );
}

/** Ô icon dịch vụ của chat nhóm trong header (size-10, nền dịch vụ nhạt). */
function GroupHeaderIcon({ kind }: { kind: string | null | undefined }) {
  const service = groupService(kind);
  return (
    <View className={`size-10 items-center justify-center rounded-full ${SERVICE[service].soft}`}>
      <Icon icon={SERVICE[service].icon} service={service} />
    </View>
  );
}

/** Dải nền surface chứa thẻ ngữ cảnh dưới header xanh. */
function ContextStrip({ children }: { children: ReactNode }) {
  return <View className="border-b border-border bg-surface px-4 py-2.5">{children}</View>;
}

function ListingContext({ conversation: c, mini }: { conversation: ConversationSummary; mini?: MiniSlug }) {
  const { t } = useTranslation(['chat', 'common']);
  const price = useConversationPrice();
  const gone = !c.listing_title;
  const inactive = c.listing_status && c.listing_status !== 'active';
  const priceText = price(c);

  return (
    <ContextStrip>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={gone ? t('inbox.listing_gone') : `${t('thread.view_listing')}: ${c.listing_title}`}
        disabled={gone || !c.context_id}
        onPress={() => c.context_id && openListing(c.context_id, { mini })}
        className="min-h-14 flex-row items-center gap-3 rounded-md border border-border bg-bg p-2 active:bg-surface-2"
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
          <Text variant="label" weight="semibold" numberOfLines={1} tone={gone ? 'muted' : 'default'}>
            {c.listing_title ?? t('inbox.listing_gone')}
          </Text>
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
            {priceText ? (
              <Text variant="caption" weight="bold" tone="primary">
                {priceText}
              </Text>
            ) : null}
            {inactive && c.listing_status ? <Badge label={t(`common:status.${c.listing_status}`)} tone="neutral" /> : null}
          </View>
        </View>
        {gone ? null : (
          <View className="flex-row items-center">
            <Text variant="caption" weight="semibold" tone="primary">
              {t('thread.view_listing')}
            </Text>
            <Icon icon={ChevronRight} tone="primary" size={16} />
          </View>
        )}
      </Pressable>
    </ContextStrip>
  );
}

/** Thẻ ngữ cảnh chat nhóm: giờ hẹn (ngày giờ · còn bao lâu) + trạng thái nhóm → chạm mở chi tiết nhóm. */
function GroupContext({ conversation: c }: { conversation: ConversationSummary }) {
  const { t } = useTranslation('group');
  const texts = useGroupTexts();
  const service = groupService(c.group_kind);
  const source = { status: c.group_status, starts_at: c.group_starts_at };
  const status = groupDisplayStatus(source);
  const label = texts.status(source);

  return (
    <ContextStrip>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[t('chat.view_group'), formatDate(c.group_starts_at, 'datetime'), formatRelative(c.group_starts_at), label].join(', ')}
        disabled={!c.context_id}
        onPress={() => c.context_id && openGroup(c.context_id)}
        className="min-h-14 flex-row items-center gap-3 rounded-md border border-border bg-bg p-2 active:bg-surface-2"
      >
        <View className={`size-10 items-center justify-center rounded-md ${SERVICE[service].soft}`}>
          <Icon icon={SERVICE[service].icon} service={service} />
        </View>
        <View className="flex-1 gap-1">
          <Text variant="caption" weight="semibold" numberOfLines={1}>
            {formatDate(c.group_starts_at, 'datetime')}
          </Text>
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {formatRelative(c.group_starts_at)}
            </Text>
            <Badge label={label} tone={GROUP_STATUS_TONE[status]} numberOfLines={1} />
          </View>
        </View>
        <View className="flex-row items-center">
          <Text variant="caption" weight="semibold" tone="primary">
            {t('chat.view_group')}
          </Text>
          <Icon icon={ChevronRight} tone="primary" size={16} />
        </View>
      </Pressable>
    </ContextStrip>
  );
}

