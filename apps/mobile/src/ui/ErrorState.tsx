// ErrorState — lỗi tải dữ liệu: thông báo theo mã (errors.<code>) + nút Thử lại. Khớp ErrorState của web.
// `compact`: lỗi của một khối trong màn (Hub): một hàng nền surface bo lg — icon + câu báo (`message` hoặc
// mã lỗi) + nút Thử lại nhỏ; không làm hỏng cả trang (docs/design/home.md §5).
import { CloudOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export function ErrorState({
  code = 'unknown',
  onRetry,
  compact = false,
  title,
  className,
}: {
  code?: string;
  onRetry?: () => void;
  compact?: boolean;
  /** Tiêu đề thay cho `states.error_title` (vd "Không tải được mục này"). */
  title?: string;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const key = `errors:${code}`;
  const message = i18n.exists(key) ? t(key) : t('errors:unknown');
  if (compact) {
    return (
      <View
        accessibilityRole="alert"
        className={['flex-row items-center gap-3 rounded-lg bg-surface p-3 shadow-card', className].filter(Boolean).join(' ')}
      >
        <View className="size-10 items-center justify-center rounded-full bg-surface-2">
          <Icon icon={CloudOff} tone="muted" />
        </View>
        <View className="flex-1">
          <Text variant="label">{title ?? t('states.error_title')}</Text>
          <Text variant="caption" tone="muted">
            {message}
          </Text>
        </View>
        {onRetry ? <Button size="sm" variant="outline" label={t('actions.retry')} onPress={onRetry} /> : null}
      </View>
    );
  }
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
