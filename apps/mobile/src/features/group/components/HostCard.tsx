// Người tạo nhóm: ảnh đại diện, tên công khai ("An N." — view đã che họ tên đầy đủ), tham gia từ, đánh giá, huy hiệu.
// Chạm → hồ sơ công khai (báo cáo / chặn ở đó). Chữ dùng chung với người đăng tin (ns listing: detail.*, owner_badge.*).
import type { PublicGroup } from '@hp/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { openProfile } from '@/features/profile/navigation';
import { formatDate, formatNumber } from '@/lib/format';
import { profileAvatarUrl } from '@/lib/images';
import { Avatar, Badge, Card, SectionHeader, Text } from '@/ui';

type Host = Pick<
  PublicGroup,
  'host_id' | 'host_name' | 'host_avatar_url' | 'host_since' | 'host_rating_avg' | 'host_rating_count' | 'host_badges'
>;

export function HostCard({ group }: { group: Host }) {
  const { t, i18n } = useTranslation('group');
  const name = group.host_name ?? '';
  const rating =
    group.host_rating_count > 0
      ? t('listing:detail.rating', { avg: formatNumber(Math.round(group.host_rating_avg * 10) / 10), count: group.host_rating_count })
      : t('listing:detail.no_rating');
  const badges = group.host_badges.filter((b) => i18n.exists(`listing:owner_badge.${b}`));

  return (
    <View className="gap-2">
      <SectionHeader title={t('detail.host')} bar="primary" />
      <Card onPress={() => openProfile(group.host_id)} accessibilityLabel={`${name}, ${t('common:profile.view')}`}>
        <View className="flex-row items-start gap-3">
          <Avatar uri={profileAvatarUrl(group.host_avatar_url)} name={name || '?'} />
          <View className="flex-1 gap-1">
            <Text variant="label">{name}</Text>
            <Text variant="caption" tone="muted">
              {t('listing:detail.member_since', { date: formatDate(group.host_since) })}
            </Text>
            <Text variant="caption" tone="muted">
              {rating}
            </Text>
            {badges.length > 0 ? (
              <View className="flex-row flex-wrap gap-1 pt-1">
                {badges.map((b) => (
                  <Badge key={b} label={t(`listing:owner_badge.${b}`)} tone="success" />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    </View>
  );
}
