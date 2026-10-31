// Checkbox — ô tích kèm nhãn; cả dòng là vùng chạm (≥ 44). Nhãn có thể chứa link (children).
import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from './Icon';

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Nội dung nhãn (Text, có thể lồng link). */
  children: ReactNode;
  accessibilityLabel: string;
  invalid?: boolean;
};

export function Checkbox({ checked, onChange, children, accessibilityLabel, invalid = false }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onChange(!checked)}
      className="min-h-11 flex-row items-start gap-3 py-2"
    >
      <View
        className={[
          'mt-0.5 h-6 w-6 items-center justify-center rounded-sm border',
          checked ? 'border-primary bg-primary' : invalid ? 'border-danger bg-surface' : 'border-border bg-surface',
        ].join(' ')}
      >
        {checked ? <Icon icon={Check} tone="onPrimary" size={16} /> : null}
      </View>
      <View className="flex-1">{children}</View>
    </Pressable>
  );
}
