// PromoCard — thẻ mời hành động (thẻ cá nhân ở Hub khi là khách / chưa hoàn thiện hồ sơ / chưa có tin, style Stitch):
// nền surface bo lg viền border + shadow-card p-4; hàng trên: ô size-10 rounded-md bg-primary-light với icon 20 màu
// primary + [tiêu đề text-md 600 + mô tả muted]; nút bên dưới rộng hết thẻ (cao 48). Hoạ tiết trang trí: vòng tròn nét
// đứt primary mờ góc phải trên (ẩn với trình đọc màn hình, không nhận chạm; lớp riêng overflow-hidden để không cắt bóng
// thẻ trên iOS). Chữ không bị cắt.
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Button, type ButtonVariant } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export type PromoCardProps = {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void; icon?: LucideIcon; variant?: ButtonVariant };
  /** Nội dung thêm giữa chữ và nút. */
  children?: ReactNode;
  className?: string;
};

export function PromoCard({ icon, title, body, action, children, className }: PromoCardProps) {
  return (
    <View className={['gap-4 rounded-lg border border-border bg-surface p-4 shadow-card', className].filter(Boolean).join(' ')}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        className="absolute inset-0 overflow-hidden rounded-lg"
      >
        <View className="absolute -right-8 -top-8 size-24 rounded-full border border-dashed border-primary/20" />
        <View className="absolute -right-2 -top-2 size-12 rounded-full bg-primary/5" />
      </View>
      <View className="flex-row items-start gap-3">
        <View className="size-10 items-center justify-center rounded-md bg-primary-light">
          <Icon icon={icon} tone="primary" />
        </View>
        <View className="flex-1 gap-1">
          <Text variant="label" weight="semibold" accessibilityRole="header">
            {title}
          </Text>
          {body ? (
            <Text tone="muted">
              {body}
            </Text>
          ) : null}
        </View>
      </View>
      {children}
      {action ? (
        <Button fullWidth label={action.label} icon={action.icon} variant={action.variant ?? 'primary'} onPress={action.onPress} />
      ) : null}
    </View>
  );
}
