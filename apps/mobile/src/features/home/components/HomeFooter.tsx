// Chân Hub (§4.9, style Stitch): MỘT thẻ Cộng đồng (public_stats — chỉ khi có tin): đầu thẻ [ô size-6 rounded-sm
// bg-primary-light + Users] + "Cộng đồng …" đậm; dưới là 3 cột số thành viên · tin đang đăng · khu (số text-xl đậm primary,
// ngăn cột border-l). Một hộp giao dịch an toàn (Notice bordered warning — chỉ một hộp, Stitch lặp hai lần là lỗi).
// Hàng chọn ngôn ngữ (vi · en · zh — đang chọn: primary đậm gạch chân; useChangeLocale của profile). Dòng miễn trừ
// text-xs muted (bắt buộc). Số liệu lỗi / đang tải → bỏ qua khối số (không chặn phần an toàn + miễn trừ).
import { LOCALES } from '@hp/shared';
import { ShieldCheck, Users } from 'lucide-react-native';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useChangeLocale } from '@/features/profile/hooks';
import { formatNumber } from '@/lib/format';
import { Icon, Notice, Skeleton, StatColumns, Text } from '@/ui';
import { useHomeStats } from '../hooks';

const CARD = 'gap-3 rounded-lg border border-border bg-surface p-4 shadow-card';

export function HomeFooter() {
  const { t } = useTranslation();
  const stats = useHomeStats();
  const s = stats.data;
  const locale = useChangeLocale();

  return (
    <View className="gap-6 px-4">
      {stats.isLoading ? (
        <View className={CARD}>
          <View className="flex-row items-center gap-2">
            <Skeleton className="size-6 rounded-sm" />
            <Skeleton className="h-5 w-1/2" />
          </View>
          <View className="flex-row py-1">
            {[0, 1, 2].map((i) => (
              <View key={i} className={['flex-1 items-center gap-2 px-2', i > 0 ? 'border-l border-border' : ''].join(' ')}>
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-4 w-16" />
              </View>
            ))}
          </View>
        </View>
      ) : s && s.listings > 0 ? (
        <View className={CARD}>
          <View className="flex-row items-center gap-2">
            <View className="size-6 items-center justify-center rounded-sm bg-primary-light">
              <Icon icon={Users} tone="primary" size={16} />
            </View>
            <Text variant="label" weight="semibold" accessibilityRole="header" className="flex-1">
              {t('home.community_title')}
            </Text>
          </View>
          <StatColumns
            size="md"
            className="py-1"
            items={[
              { value: formatNumber(s.users), label: t('home.stats.users'), tone: 'primary' },
              { value: formatNumber(s.listings), label: t('home.stats.listings'), tone: 'primary' },
              { value: formatNumber(s.sites), label: t('home.stats.sites'), tone: 'primary' },
            ]}
          />
        </View>
      ) : null}

      <Notice variant="bordered" tone="warning" icon={ShieldCheck} title={t('home.safety_title')} text={t('listing:detail.safety_tip')} />

      <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.language')} className="flex-row items-center justify-center">
        {LOCALES.map((l, i) => {
          const active = locale.current === l;
          return (
            <Fragment key={l}>
              {i > 0 ? (
                <Text variant="caption" tone="muted" accessibilityElementsHidden importantForAccessibility="no">
                  ·
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => (active ? undefined : locale.change(l))}
                className="min-h-11 justify-center px-3 active:opacity-70"
              >
                <Text variant="caption" weight={active ? 'bold' : 'medium'} tone={active ? 'primary' : 'muted'} className={active ? 'underline' : undefined}>
                  {t(`locale.${l}`)}
                </Text>
              </Pressable>
            </Fragment>
          );
        })}
      </View>

      <Text variant="micro" tone="muted" className="-mt-4 text-center">
        {t('disclaimer')}
      </Text>
    </View>
  );
}
