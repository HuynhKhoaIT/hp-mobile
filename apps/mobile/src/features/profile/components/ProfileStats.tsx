// Dải số liệu tab Tôi (style Stitch): một thẻ 3 cột ngăn bằng vạch — tin đang đăng · tổng lượt xem (my_listing_stats) ·
// điểm đánh giá trung bình 1 chữ số thập phân + ★ cam (đồ hoạ; nhãn "{n} đánh giá" nói rõ nghĩa). Chưa có đánh giá →
// "—" + "Chưa có đánh giá". Số text-xl đậm primary, nhãn text-sm muted. Đang tải → khung chờ cùng khung; lỗi → thử lại.
import type { MyProfile } from '@hp/core';
import { useMyListingStats } from '@hp/core/react';
import { Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatNumber } from '@/lib/format';
import { ErrorState, Skeleton, StatColumns, type StatItem } from '@/ui';

const BOX = 'rounded-lg border border-border bg-surface py-3.5 shadow-card';

export function ProfileStats({ profile }: { profile: Pick<MyProfile, 'rating_avg' | 'rating_count'> }) {
  const { t } = useTranslation();
  const stats = useMyListingStats();

  if (stats.isError) {
    return <ErrorState compact title={t('home.section_error')} code={stats.error.code} onRetry={() => void stats.refetch()} />;
  }
  if (!stats.data) return <ProfileStatsSkeleton />;

  const rating: StatItem =
    profile.rating_count > 0
      ? {
          value: formatNumber(Math.round(profile.rating_avg * 10) / 10),
          label: t('profile.ratings', { count: profile.rating_count }),
          tone: 'primary',
          icon: { glyph: Star, tone: 'accent' },
        }
      : { value: '—', label: t('profile.no_rating'), tone: 'primary' };

  return (
    <View className={BOX}>
      <StatColumns
        size="md"
        items={[
          { value: formatNumber(stats.data.active), label: t('profile.listings'), tone: 'primary' },
          { value: formatNumber(stats.data.total_views), label: t('home.card.views'), tone: 'primary' },
          rating,
        ]}
      />
    </View>
  );
}

export function ProfileStatsSkeleton() {
  return (
    <View className={`flex-row ${BOX}`}>
      {[0, 1, 2].map((i) => (
        <View key={i} className={['flex-1 items-center gap-2 px-2', i > 0 ? 'border-l border-border' : ''].join(' ')}>
          <Skeleton className="h-7 w-10" />
          <Skeleton className="h-4 w-16" />
        </View>
      ))}
    </View>
  );
}
