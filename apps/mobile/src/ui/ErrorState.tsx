// ErrorState — lỗi tải dữ liệu: thông báo theo mã (errors.<code>) + nút Thử lại. Khớp ErrorState của web.
import { CloudOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export function ErrorState({ code = 'unknown', onRetry }: { code?: string; onRetry?: () => void }) {
  const { t, i18n } = useTranslation();
  const key = `errors:${code}`;
  const message = i18n.exists(key) ? t(key) : t('errors:unknown');
  return (
    <View accessibilityRole="alert" className="items-center gap-3 px-4 py-12">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-surface-2">
        <Icon icon={CloudOff} tone="muted" size={32} />
      </View>
      <Text variant="title" className="text-center">
        {t('states.error_title')}
      </Text>
      <Text tone="muted" className="text-center">
        {message}
      </Text>
      {onRetry ? <Button variant="outline" label={t('actions.retry')} onPress={onRetry} className="mt-2" /> : null}
    </View>
  );
}
