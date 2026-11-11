// Thẻ hồ sơ công khai (style Stitch "Hồ sơ công khai người khác"; dữ liệu public_profiles — không SĐT, tên "An N."):
//   hàng đầu: ảnh đại diện 64 + dấu xác minh (nền primary, khi có huy hiệu) | tên đậm (header) · "Đã xác minh" · khu làm việc
//   (MapPin primary) · "Tham gia {ngày}" → dải 3 số liệu trên nền bg (StatColumns, giống dải 2 số của OwnerCard): đánh giá
//   (★ + số lượt) · tham gia · số huy hiệu → huy hiệu xác minh (Badge success, có chữ) hoặc dòng "chưa có huy hiệu".
// Cùng thứ tự thông tin với bản web (apps/web/src/features/profile/components/public-profile-card.tsx).
// Khác Stitch (cố ý): không tuổi, xưởng / tổ, "trực tuyến x phút trước", tỉ lệ phản hồi (view công khai không có — và tuổi /
// nơi làm cụ thể là PII); không nút Zalo / Gọi (SĐT chỉ lộ qua reveal_contact ở tin), không "Lưu danh thiếp & Theo dõi"
// (chưa có tính năng theo dõi); huy hiệu là huy hiệu xác minh của hệ thống, không có icon riêng từng loại.
import type { PublicProfile } from '@hp/core';
import { Check, MapPin, Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatDate, formatNumber } from '@/lib/format';
import { profileAvatarUrl } from '@/lib/images';
import { Avatar, Badge, Card, Icon, Skeleton, StatColumns, Text } from '@/ui';
import { useSiteName } from '../hooks';

export function PublicProfileCard({ profile: p }: { profile: PublicProfile }) {
  const { t, i18n } = useTranslation();
  const site = useSiteName(p.site);
  const name = p.display_name || t('chat:inbox.deleted_user');
  const ratingCount = p.rating_count ?? 0;
  const badges = (p.badges ?? []).filter((b) => i18n.exists(`listing:owner_badge.${b}`));
  const verified = badges.length > 0;

  return (
    <Card className="gap-4">
      <View className="flex-row items-start gap-3">
        <View>
          <Avatar uri={profileAvatarUrl(p.avatar_url)} name={name} size="lg" />
          {verified ? (
            <View className="absolute -bottom-0.5 -right-0.5 size-6 items-center justify-center rounded-full border-2 border-surface bg-primary">
              <Icon icon={Check} tone="onPrimary" size={14} strong />
            </View>
          ) : null}
        </View>
        <View className="flex-1 gap-1">
          <Text
            variant="titleLg"
            weight="bold"
            accessibilityRole="header"
            accessibilityLabel={verified ? `${name}, ${t('profile.verified')}` : name}
          >
            {name}
          </Text>
          {verified ? (
            <Text variant="caption" tone="success" weight="semibold">
              {t('profile.verified')}
            </Text>
          ) : null}
          {site ? (
            <View className="flex-row items-center gap-1">
              <Icon icon={MapPin} tone="primary" size={16} />
              <Text variant="caption" tone="primary" weight="medium" className="shrink">
                {site}
              </Text>
            </View>
          ) : null}
          {p.created_at ? (
            <Text variant="caption" tone="muted">
              {t('profile.member_since', { date: formatDate(p.created_at) })}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="rounded-md bg-bg py-2.5">
        <StatColumns
          size="md"
          items={[
            ratingCount > 0
              ? {
                  value: formatNumber(Math.round((p.rating_avg ?? 0) * 10) / 10),
                  label: t('profile.ratings', { count: ratingCount }),
                  icon: { glyph: Star, tone: 'warning' },
                }
              : { value: t('listing:detail.no_rating_short'), label: t('listing:detail.stat_rating') },
            { value: p.created_at ? formatDate(p.created_at) : '—', label: t('listing:detail.stat_joined') },
            { value: formatNumber(badges.length), label: t('profile.stat_badges'), tone: 'primary' },
          ]}
        />
      </View>

      {verified ? (
        <View className="flex-row flex-wrap gap-1.5">
          {badges.map((b) => (
            <Badge key={b} label={t(`listing:owner_badge.${b}`)} tone="success" />
          ))}
        </View>
      ) : (
        <Text variant="caption" tone="muted">
          {t('profile.no_badges')}
        </Text>
      )}
    </Card>
  );
}

export function PublicProfileCardSkeleton() {
  return (
    <Card className="gap-4">
      <View className="flex-row items-start gap-3">
        <Skeleton className="size-16 rounded-full" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-6 w-2/3 rounded-sm" />
          <Skeleton className="h-4 w-1/2 rounded-sm" />
          <Skeleton className="h-4 w-1/3 rounded-sm" />
        </View>
      </View>
      <Skeleton className="h-16 w-full rounded-md" />
      <Skeleton className="h-6 w-1/2 rounded-full" />
    </Card>
  );
}
