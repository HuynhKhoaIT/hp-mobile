// PageHero — header xanh của màn danh sách (tin theo tính năng, Khám phá, Tìm kiếm — style Stitch): cùng ngôn ngữ với header
// Hub / tab Tôi: nền primary bo đáy rounded-b-xl + hoạ tiết HeroDecor (dải xanh kéo lên vùng trạng thái).
// Hàng 1 (min-h-12): nút quay lại tròn trong mờ (khi có onBack) | ô icon dịch vụ size-10 (nền màu dịch vụ nhạt) |
// tiêu đề text-xl đậm 700 + dòng phụ text-sm on-primary 90% | vùng phải (`right`). `children` (vd ô tìm kiếm) bên dưới.
// Tràn mép màn: -mx-4 bù padding 16 của Screen (màn không scroll). Chữ on-primary trên primary ≥ 4,5:1.
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { HeroDecor } from './HomeHeader';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { SERVICE, type ServiceKey } from './service';
import { Text } from './Text';

export type PageHeroProps = {
  title: string;
  subtitle?: string;
  /** Có → nút quay lại trong mờ ở đầu hàng. */
  onBack?: () => void;
  /** Ô icon dịch vụ trước tiêu đề. */
  service?: ServiceKey | null;
  right?: ReactNode;
  children?: ReactNode;
};

export function PageHero({ title, subtitle, onBack, service, right, children }: PageHeroProps) {
  const { t } = useTranslation();
  return (
    <View className="-mx-4 rounded-b-xl bg-primary px-4 pb-4 pt-2">
      <HeroDecor rounded="rounded-b-xl" />
      <View className="min-h-12 flex-row items-center gap-3">
        {onBack ? <IconButton icon={ChevronLeft} variant="glass" accessibilityLabel={t('actions.back')} onPress={onBack} /> : null}
        {service ? (
          <View className={`size-10 items-center justify-center rounded-md ${SERVICE[service].soft}`}>
            <Icon icon={SERVICE[service].icon} service={service} />
          </View>
        ) : null}
        <View className="flex-1">
          <Text variant="titleLg" weight="bold" tone="onPrimary" accessibilityRole="header" numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="onPrimary" className="opacity-90" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
      </View>
      {children ? <View className="mt-3 gap-2">{children}</View> : null}
    </View>
  );
}
