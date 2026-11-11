// ToggleRow — dòng cài đặt có công tắc: nhãn + gợi ý (tuỳ chọn) bên trái, Switch bên phải. Chạm cả dòng để đổi.
// Màu theo token (bật: primary). Vùng chạm cả dòng ≥ 48.
// `iconBox` (Cài đặt thông báo, style Stitch "PushPermissionCard"): icon 20 trong ô size-10 rounded-md nền nhạt — màu dịch
// vụ (ServiceKey) hoặc 'primary' (nền primary-light, icon primary); không có → icon muted trơn như cũ.
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Switch, View } from 'react-native';
import { Icon } from './Icon';
import { SERVICE, type ServiceKey } from './service';
import { Text } from './Text';
import { useTheme } from './theme';

export type ToggleRowProps = {
  label: string;
  hint?: string;
  icon?: LucideIcon;
  /** Đặt icon trong ô màu nhạt: màu dịch vụ hoặc 'primary'. */
  iconBox?: ServiceKey | 'primary';
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

function RowIcon({ icon, box }: { icon: LucideIcon; box?: ServiceKey | 'primary' }) {
  if (!box) return <Icon icon={icon} tone="muted" />;
  if (box === 'primary') {
    return (
      <View className="size-10 items-center justify-center rounded-md bg-primary-light">
        <Icon icon={icon} tone="primary" />
      </View>
    );
  }
  return (
    <View className={`size-10 items-center justify-center rounded-md ${SERVICE[box].soft}`}>
      <Icon icon={icon} service={box} />
    </View>
  );
}

export function ToggleRow({ label, hint, icon, iconBox, value, onValueChange, disabled = false }: ToggleRowProps) {
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
      {icon ? <RowIcon icon={icon} box={iconBox} /> : null}
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
