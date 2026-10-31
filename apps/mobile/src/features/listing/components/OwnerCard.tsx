// Người đăng: ảnh đại diện, tên hiển thị (view đã che họ tên đầy đủ), tham gia từ, đánh giá, huy hiệu xác minh.
import type { PublicListing } from '@hp/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatDate, formatNumber } from '@/lib/format';
import { profileAvatarUrl } from '@/lib/images';
import { Avatar, Badge, Card, SectionHeader, Text } from '@/ui';

type Owner = Pick<
  PublicListing,
  'owner_name' | 'owner_avatar_url' | 'owner_since' | 'owner_rating_avg' | 'owner_rating_count' | 'owner_badges'
>;

export function OwnerCard({ listing }: { listing: Owner }) {
  const { t, i18n } = useTranslation('listing');
  const name = listing.owner_name ?? '';
  const rating =
    listing.owner_rating_count > 0
      ? t('detail.rating', { avg: formatNumber(Math.round(listing.owner_rating_avg * 10) / 10), count: listing.owner_rating_count })
      : t('detail.no_rating');
  const badges = listing.owner_badges.filter((b) => i18n.exists(`listing:owner_badge.${b}`));

  return (
    <View className="gap-2">
      <SectionHeader title={t('detail.posted_by')} />
      <Card>
        <View className="flex-row items-start gap-3">
          <Avatar uri={profileAvatarUrl(listing.owner_avatar_url)} name={name || '?'} />
          <View className="flex-1 gap-1">
            <Text variant="label">{name}</Text>
            <Text variant="caption" tone="muted">
              {t('detail.member_since', { date: formatDate(listing.owner_since) })}
            </Text>
            <Text variant="caption" tone="muted">
              {rating}
            </Text>
            {badges.length > 0 ? (
              <View className="flex-row flex-wrap gap-1 pt-1">
                {badges.map((b) => (
                  <Badge key={b} label={t(`owner_badge.${b}`)} tone="success" />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    </View>
  );
}
