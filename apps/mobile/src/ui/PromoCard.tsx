// PromoCard — thẻ mời hành động (thẻ cá nhân ở Hub khi là khách / chưa hoàn thiện hồ sơ / chưa có tin,
// docs/design/home.md §10): nền surface bo xl shadow-card p-4; trái: ô size-12 rounded-lg bg-primary-light với icon
// minh hoạ 40 màu primary; phải: tiêu đề text-md 600 + mô tả muted; nút bên dưới rộng hết thẻ. Chữ không bị cắt.
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
    <View className={['gap-4 rounded-xl bg-surface p-4 shadow-card', className].filter(Boolean).join(' ')}>
      <View className="flex-row items-start gap-3">
        <View className="size-12 items-center justify-center rounded-lg bg-primary-light">
          <Icon icon={icon} tone="primary" size={40} />
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
        <Button
          fullWidth
          size="sm"
          label={action.label}
          icon={action.icon}
          variant={action.variant ?? 'primary'}
          onPress={action.onPress}
        />
      ) : null}
    </View>
  );
}
