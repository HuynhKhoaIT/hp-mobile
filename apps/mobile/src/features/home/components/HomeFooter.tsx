// Chân Hub (§4.9, §10): số liệu cộng đồng (public_stats: thành viên · tin đang đăng · khu — chỉ khi có tin), hộp
// giao dịch an toàn (viền warning/40, nền warning/10, ShieldCheck 24), dòng miễn trừ text-xs muted (bắt buộc).
// Số liệu lỗi / đang tải → bỏ qua khối số (không chặn phần an toàn + miễn trừ).
import { ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatNumber } from '@/lib/format';
import { Notice, SectionHeader, Skeleton, StatTile, Text } from '@/ui';
import { useHomeStats } from '../hooks';

export function HomeFooter() {
  const { t } = useTranslation();
  const stats = useHomeStats();
  const s = stats.data;

  return (
    <View className="gap-6 px-4">
      {stats.isLoading ? (
        <View className="gap-3">
          <Skeleton className="h-6 w-1/2" />
          <View className="flex-row gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 flex-1 rounded-lg" />
            ))}
          </View>
        </View>
      ) : s && s.listings > 0 ? (
        <View className="gap-3">
          <SectionHeader title={t('home.community_title')} />
          <View className="flex-row gap-3">
            <StatTile className="flex-1" value={formatNumber(s.users)} label={t('home.stats.users')} />
            <StatTile className="flex-1" value={formatNumber(s.listings)} label={t('home.stats.listings')} />
            <StatTile className="flex-1" value={formatNumber(s.sites)} label={t('home.stats.sites')} />
          </View>
        </View>
      ) : null}

      <Notice variant="bordered" tone="warning" icon={ShieldCheck} title={t('home.safety_title')} text={t('listing:detail.safety_tip')} />

      <Text variant="micro" tone="muted" className="text-center">
        {t('disclaimer')}
      </Text>
    </View>
  );
}
