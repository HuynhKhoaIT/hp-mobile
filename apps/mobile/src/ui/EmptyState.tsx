// EmptyState — dữ liệu rỗng: biểu tượng + tiêu đề + mô tả + một CTA. Khớp EmptyState của web.
import { Inbox, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ title, description, icon = Inbox, action }: EmptyStateProps) {
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
      {action ? <Button label={action.label} onPress={action.onPress} className="mt-2" /> : null}
    </View>
  );
}
