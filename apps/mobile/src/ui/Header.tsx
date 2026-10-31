// Header — thanh tiêu đề cho màn không phải tab: nút quay lại (nếu quay lại được), tiêu đề, một vùng hành động phải.
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { IconButton } from './IconButton';
import { Text } from './Text';

export type HeaderProps = {
  title?: string;
  /** Mặc định: hiện nút quay lại khi có màn trước. */
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
};

export function Header({ title, back = router.canGoBack(), onBack, right }: HeaderProps) {
  const { t } = useTranslation();
  return (
    <View className="min-h-14 flex-row items-center gap-1">
      {back ? (
        <IconButton icon={ChevronLeft} accessibilityLabel={t('actions.back')} onPress={onBack ?? (() => router.back())} />
      ) : null}
      <Text variant="title" accessibilityRole="header" className="flex-1" numberOfLines={2}>
        {title ?? ''}
      </Text>
      {right ? <View className="flex-row items-center gap-1">{right}</View> : null}
    </View>
  );
}
