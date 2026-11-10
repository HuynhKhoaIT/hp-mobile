// Thẻ hồ sơ công khai (public_profiles — không SĐT, tên "An N."): ảnh, tên, đánh giá, tham gia từ, khu, huy hiệu.
// Dùng ở màn profile/[id]; cùng thứ tự thông tin với OwnerCard ở chi tiết tin.
import type { PublicProfile } from '@hp/core';
import { useSites } from '@hp/core/react';
import { MapPin, Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatDate, formatNumber } from '@/lib/format';
import { profileAvatarUrl } from '@/lib/images';
import { Avatar, Badge, Card, Icon, Skeleton, Text } from '@/ui';

export function PublicProfileCard({ profile: p }: { profile: PublicProfile }) {
  const { t, i18n } = useTranslation();
  const sites = useSites();
  const name = p.display_name || t('chat:inbox.deleted_user');
  const site = sites.data?.find((s) => s.code === p.site)?.name;
  const ratingCount = p.rating_count ?? 0;
  const badges = (p.badges ?? []).filter((b) => i18n.exists(`listing:owner_badge.${b}`));

  return (
    <Card className="items-center gap-3 py-5">
      <Avatar uri={profileAvatarUrl(p.avatar_url)} name={name} size="lg" />
      <View className="items-center gap-1">
        <Text variant="titleLg" accessibilityRole="header">
          {name}
        </Text>
        {p.created_at ? (
          <Text variant="caption" tone="muted">
            {t('profile.member_since', { date: formatDate(p.created_at) })}
          </Text>
        ) : null}
      </View>
      <View className="flex-row flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <View className="flex-row items-center gap-1">
          <Icon icon={Star} tone={ratingCount > 0 ? 'warning' : 'muted'} size={16} />
          <Text variant="caption" tone="muted">
            {ratingCount > 0
              ? t('profile.rating', { avg: formatNumber(Math.round((p.rating_avg ?? 0) * 10) / 10), count: ratingCount })
              : t('profile.no_rating')}
          </Text>
        </View>
        {site ? (
          <View className="flex-row items-center gap-1">
            <Icon icon={MapPin} tone="muted" size={16} />
            <Text variant="caption" tone="muted">
              {site}
            </Text>
          </View>
        ) : null}
      </View>
      {badges.length > 0 ? (
        <View className="flex-row flex-wrap justify-center gap-1">
          {badges.map((b) => (
            <Badge key={b} label={t(`listing:owner_badge.${b}`)} tone="success" />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

export function PublicProfileCardSkeleton() {
  return (
    <Card className="items-center gap-3 py-5">
      <Skeleton className="h-16 w-16 rounded-full" />
      <Skeleton className="h-6 w-32 rounded-sm" />
      <Skeleton className="h-4 w-48 rounded-sm" />
    </Card>
  );
}
