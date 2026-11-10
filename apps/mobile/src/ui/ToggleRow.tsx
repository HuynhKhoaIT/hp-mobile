// ToggleRow — dòng cài đặt có công tắc: nhãn + gợi ý (tuỳ chọn) bên trái, Switch bên phải. Chạm cả dòng để đổi.
// Màu theo token (bật: primary). Vùng chạm cả dòng ≥ 48.
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Switch, View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';
import { useTheme } from './theme';

export type ToggleRowProps = {
  label: string;
  hint?: string;
  icon?: LucideIcon;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

export function ToggleRow({ label, hint, icon, value, onValueChange, disabled = false }: ToggleRowProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      className={['min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-surface-2', disabled ? 'opacity-50' : ''].join(' ')}
    >
      {icon ? <Icon icon={icon} tone="muted" /> : null}
      <View className="flex-1 gap-0.5">
        <Text variant="label">{label}</Text>
        {hint ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: t.colors.border, true: t.colors.primary }}
        thumbColor={t.colors.surface}
        ios_backgroundColor={t.colors.border}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
}
