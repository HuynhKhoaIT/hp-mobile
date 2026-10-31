// ServiceTile — ô dịch vụ ở Hub: icon trong vòng nền màu dịch vụ + chữ (icon ở Hub luôn kèm chữ).
// Chữ dùng text-fg (không dùng màu dịch vụ cho chữ). Nhấn thu nhỏ 0.97 qua Card.
import { View } from 'react-native';
import { Card } from './Card';
import { Icon } from './Icon';
import { SERVICE, type ServiceKey } from './service';
import { Text } from './Text';

export type ServiceTileProps = {
  service: ServiceKey;
  label: string;
  onPress?: () => void;
  className?: string;
};

export function ServiceTile({ service, label, onPress, className }: ServiceTileProps) {
  return (
    <Card onPress={onPress} accessibilityLabel={label} className={['min-h-24 items-center gap-2', className].filter(Boolean).join(' ')}>
      <View className={`h-12 w-12 items-center justify-center rounded-full ${SERVICE[service].soft}`}>
        <Icon icon={SERVICE[service].icon} service={service} size="tab" />
      </View>
      <Text variant="label" className="text-center">
        {label}
      </Text>
    </Card>
  );
}
