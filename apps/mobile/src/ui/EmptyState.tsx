// EmptyState — dữ liệu rỗng: biểu tượng + tiêu đề + mô tả + một CTA. Khớp EmptyState của web.
// `compact`: rỗng của một khối trong màn (vd dải "Gần {khu}" ở Hub): một hàng nền surface bo lg + nút nhỏ.
import { Inbox, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; onPress: () => void; icon?: LucideIcon };
  compact?: boolean;
  className?: string;
};

export function EmptyState({ title, description, icon = Inbox, action, compact = false, className }: EmptyStateProps) {
  if (compact) {
    return (
      <View
        accessibilityRole="summary"
        className={['gap-3 rounded-lg bg-surface p-3 shadow-card', className].filter(Boolean).join(' ')}
      >
        <View className="flex-row items-center gap-3">
          <View className="size-10 items-center justify-center rounded-full bg-primary-light">
            <Icon icon={icon} tone="primary" />
          </View>
          <View className="flex-1">
            <Text variant="label">{title}</Text>
            {description ? (
              <Text variant="caption" tone="muted">
                {description}
              </Text>
            ) : null}
          </View>
        </View>
        {action ? <Button size="sm" variant="outline" fullWidth label={action.label} icon={action.icon} onPress={action.onPress} /> : null}
      </View>
    );
  }
  return (
    <View accessibilityRole="summary" className="items-center gap-3 px-4 py-12">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-light">
        <Icon icon={icon} tone="primary" size={32} />
      </View>
      <Text variant="title" className="text-center">
        {title}
      </Text>
      {description ? (
        <Text tone="muted" className="text-center">
          {description}
        </Text>
      ) : null}
      {action ? <Button label={action.label} icon={action.icon} onPress={action.onPress} className="mt-2" /> : null}
    </View>
  );
}
