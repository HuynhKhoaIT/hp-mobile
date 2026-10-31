// SectionHeader — tiêu đề một khối nội dung (Hub, chi tiết tin) + một liên kết phụ bên phải (vd "Xem tất cả").
import { Pressable, View } from 'react-native';
import { Text } from './Text';

export type SectionHeaderProps = {
  title: string;
  action?: { label: string; onPress: () => void };
  className?: string;
};

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <View className={['min-h-11 flex-row items-center gap-2', className].filter(Boolean).join(' ')}>
      <Text variant="title" accessibilityRole="header" className="flex-1">
        {title}
      </Text>
      {action ? (
        <Pressable accessibilityRole="link" onPress={action.onPress} hitSlop={8} className="min-h-11 justify-center active:opacity-70">
          <Text variant="label" tone="primary">
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
