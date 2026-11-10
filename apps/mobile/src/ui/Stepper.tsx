// Stepper — chọn số nguyên nhỏ bằng nút − / + (số chỗ, số người): dùng một tay, không cần bàn phím.
// Trình đọc màn hình: ô giá trị là "adjustable" (vuốt lên / xuống để tăng / giảm). Nút ở giới hạn thì tắt.
import { Minus, Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { formatNumber } from '@/lib/format';
import { IconButton } from './IconButton';
import { Text } from './Text';

export type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  label?: string;
  hint?: string;
  error?: string | null;
  /** Nhãn đọc cho nút giảm / tăng (đã dịch, vd "Bớt 1 chỗ" / "Thêm 1 chỗ"). */
  decreaseLabel: string;
  increaseLabel: string;
  disabled?: boolean;
};

export function Stepper({ value, onChange, min = 1, max, label, hint, error, decreaseLabel, increaseLabel, disabled = false }: StepperProps) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  return (
    <View className="gap-2">
      {label ? <Text variant="label">{label}</Text> : null}
      <View className={['min-h-12 flex-row items-center self-start rounded-sm border bg-surface', error ? 'border-danger' : 'border-border'].join(' ')}>
        <IconButton icon={Minus} accessibilityLabel={decreaseLabel} disabled={disabled || value <= min} onPress={() => set(value - 1)} />
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value, text: formatNumber(value) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => set(e.nativeEvent.actionName === 'increment' ? value + 1 : value - 1)}
          className="min-w-12 items-center px-2"
        >
          <Text variant="title">{formatNumber(value)}</Text>
        </View>
        <IconButton icon={Plus} accessibilityLabel={increaseLabel} disabled={disabled || value >= max} onPress={() => set(value + 1)} />
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
