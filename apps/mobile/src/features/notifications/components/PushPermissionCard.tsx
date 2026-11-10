// Thẻ mời bật push (xin quyền "mềm": người dùng bấm mới hiện hộp thoại hệ thống). Đã bị từ chối hẳn → nút mở Cài đặt máy.
// Ẩn khi đã cho phép hoặc nền tảng không hỗ trợ (web).
import { BellRing } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { usePushPermission } from '@/core/notifications';
import { Button, Card, Icon, Text } from '@/ui';

export function PushPermissionCard() {
  const { t } = useTranslation();
  const push = usePushPermission();
  if (push.status === 'granted' || push.status === 'unsupported') return null;
  const denied = push.status === 'denied';

  return (
    <Card className="gap-3">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-light">
          <Icon icon={BellRing} tone="primary" />
        </View>
        <View className="flex-1 gap-1">
          <Text variant="label">{denied ? t('notifications.system_off') : t('notifications.permission.title')}</Text>
          {denied ? null : (
            <Text variant="caption" tone="muted">
              {t('notifications.permission.body')}
            </Text>
          )}
        </View>
      </View>
      <Button
        label={denied ? t('notifications.open_settings') : t('notifications.permission.allow')}
        size="sm"
        variant={denied ? 'outline' : 'primary'}
        onPress={() => void push.request()}
      />
    </Card>
  );
}
