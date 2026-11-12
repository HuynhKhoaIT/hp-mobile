// Người đăng (style Stitch "thẻ người bán"): ảnh đại diện + dấu xác minh (khi có huy hiệu), tên hiển thị (view đã che họ
// tên đầy đủ), nút "Xem hồ sơ" → hồ sơ công khai (tin khác của người này, báo cáo / chặn); dải 2 số liệu trên nền bg:
// đánh giá · tham gia từ; huy hiệu xác minh. Không có SĐT (chỉ lộ qua reveal_contact ở thanh liên hệ).
// Khác Stitch (cố ý): không "số tin đã đăng", "thời gian phản hồi", "đang trực tuyến" — view công khai không có dữ liệu đó.
import type { PublicListing } from '@hp/core';
import { BadgeCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { openProfile } from '@/features/profile/navigation';
import { formatDate, formatNumber } from '@/lib/format';
import { profileAvatarUrl } from '@/lib/images';
import { Avatar, Badge, Button, Card, Icon, SectionHeader, Text } from '@/ui';

type Owner = Pick<
  PublicListing,
  'owner_id' | 'owner_name' | 'owner_avatar_url' | 'owner_since' | 'owner_rating_avg' | 'owner_rating_count' | 'owner_badges'
>;

/** `title`: tiêu đề khối riêng (config.detail.texts.owner — vd "Thông tin chủ trọ"); mặc định "Người đăng". */
export function OwnerCard({ listing, title }: { listing: Owner; title?: string }) {
  const { t, i18n } = useTranslation('listing');
  const name = listing.owner_name ?? '';
  const rating =
    listing.owner_rating_count > 0
      ? t('detail.rating', { avg: formatNumber(Math.round(listing.owner_rating_avg * 10) / 10), count: listing.owner_rating_count })
      : t('detail.no_rating_short');
  const badges = listing.owner_badges.filter((b) => i18n.exists(`listing:owner_badge.${b}`));
  const verified = badges.length > 0;

  return (
    <View className="gap-2">
      <SectionHeader title={title ?? t('detail.posted_by')} bar="primary" />
      <Card className="gap-3">
        <View className="flex-row items-center gap-3">
          <View>
            <Avatar uri={profileAvatarUrl(listing.owner_avatar_url)} name={name || '?'} />
            {verified ? (
              <View className="absolute -bottom-1 -right-1 rounded-full bg-surface p-0.5">
                <Icon icon={BadgeCheck} tone="success" size={16} />
              </View>
            ) : null}
          </View>
          <View className="flex-1 gap-0.5">
            <Text variant="label" weight="semibold" accessibilityLabel={verified ? `${name}, ${t('common:profile.verified')}` : name}>
              {name}
            </Text>
            {verified ? (
              <Text variant="caption" tone="muted" weight="medium">
                {t('common:profile.verified')}
              </Text>
            ) : null}
          </View>
          <Button size="sm" variant="outline" label={t('common:profile.view')} onPress={() => openProfile(listing.owner_id)} />
        </View>

        <View className="flex-row rounded-md bg-bg py-2">
          <View accessible className="flex-1 items-center gap-0.5 px-2">
            <Text variant="label" weight="bold" className="text-center">
              {rating}
            </Text>
            <Text variant="caption" tone="muted">
              {t('detail.stat_rating')}
            </Text>
          </View>
          <View accessible className="flex-1 items-center gap-0.5 border-l border-border px-2">
            <Text variant="label" weight="bold" className="text-center">
              {formatDate(listing.owner_since)}
            </Text>
            <Text variant="caption" tone="muted">
              {t('detail.stat_joined')}
            </Text>
          </View>
        </View>

        {badges.length > 0 ? (
          <View className="flex-row flex-wrap gap-1">
            {badges.map((b) => (
              <Badge key={b} label={t(`owner_badge.${b}`)} tone="success" />
            ))}
          </View>
        ) : null}
      </Card>
    </View>
  );
}
