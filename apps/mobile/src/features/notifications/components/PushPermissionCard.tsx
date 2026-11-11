// Thẻ quyền push của máy (style Stitch "Cài đặt thông báo đẩy (PushPermissionCard)"): hoạ tiết chuông mờ ở góc, nhãn trạng
// thái có chữ (Badge: chưa bật warning · đang tắt trong cài đặt máy danger · đã bật success), tiêu đề đậm primary + mô tả,
// nút chính. Xin quyền "mềm": người dùng bấm mới hiện hộp thoại hệ thống; đã bị từ chối hẳn → mẹo bật lại + nút mở Cài
// đặt máy (requestPushPermission tự mở khi không hỏi lại được). Trạng thái tự làm mới khi quay lại app (usePushPermission).
// Đã cho phép → ẩn (danh sách Thông báo), hoặc thẻ gọn "Đã bật trên máy này" khi `showGranted` (màn Cài đặt thông báo).
// Nền tảng không hỗ trợ (web) → không render.
// Khác Stitch (cố ý): không chấm nháy trên nhãn và chuông lắc (không animation lặp); nhãn không viết hoa toàn bộ (khó đọc,
// tiếng Trung không có hoa); không dòng "Thiết bị này" riêng (nhãn đã ghi "trên máy này"); mẹo "ổ khoá trên thanh URL trình
// duyệt" → mẹo Cài đặt điện thoại (push chỉ có trên app); nút cam theo token accent, bóng shadow-card thay bóng cam.
import { BellRing } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { usePushPermission } from '@/core/notifications';
import { Badge, Button, Card, Icon, Row, Text } from '@/ui';

export function PushPermissionCard({ showGranted = false }: { showGranted?: boolean }) {
  const { t } = useTranslation();
  const push = usePushPermission();
  if (push.status === 'unsupported') return null;
  if (push.status === 'granted' && !showGranted) return null;

  const granted = push.status === 'granted';
  const denied = push.status === 'denied';

  return (
    <Card className="gap-2">
      {/* Hoạ tiết trang trí: chuông lớn mờ ở góc dưới phải, cắt theo bo góc thẻ. */}
      <View className="absolute inset-0 overflow-hidden rounded-lg" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View className="absolute -bottom-6 -right-6 opacity-10">
          <Icon icon={BellRing} tone="primary" size={112} />
        </View>
      </View>

      <Badge
        label={t(granted ? 'notifications.permission.status_on' : denied ? 'notifications.permission.status_denied' : 'notifications.permission.status_off')}
        tone={granted ? 'success' : denied ? 'danger' : 'warning'}
      />

      {granted ? (
        <Text tone="muted">{t('notifications.permission.on_body')}</Text>
      ) : (
        <>
          <Text variant="title" weight="bold" tone="primary" accessibilityRole="header" className="mt-1">
            {denied ? t('notifications.system_off') : t('notifications.permission.headline')}
          </Text>
          <Text tone="muted">{t('notifications.permission.body')}</Text>
          {denied ? (
            <Row gap={2} align="start" className="mt-1 rounded-md border border-border bg-surface-2 p-3">
              <Icon icon={BellRing} tone="muted" size={18} />
              <Text variant="caption" tone="muted" className="flex-1">
                {t('notifications.permission.denied_tip')}
              </Text>
            </Row>
          ) : null}
          <View className="mt-2">
            <Button
              label={denied ? t('notifications.open_settings') : t('notifications.permission.allow')}
              icon={BellRing}
              variant={denied ? 'outline' : 'accent'}
              fullWidth
              onPress={() => void push.request()}
            />
          </View>
        </>
      )}
    </Card>
  );
}
