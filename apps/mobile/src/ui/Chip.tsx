// Chip — lựa chọn dạng viên thuốc (filter, ngôn ngữ, giao diện). Vùng chạm tối thiểu 44 (nút phụ).
// selected đổi viền + nền + màu chữ, kèm accessibilityState để không truyền tải chỉ bằng màu.
import { Pressable, type PressableProps } from 'react-native';
import { Text } from './Text';

export type ChipProps = Omit<PressableProps, 'children'> & {
  label: string;
  selected?: boolean;
  className?: string;
};

export function Chip({ label, selected = false, disabled, className, ...rest }: ChipProps) {
  const tone = disabled ? 'disabled' : selected ? 'primary' : 'default';
  const box = selected ? 'border-primary bg-primary-light' : 'border-border bg-surface';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      className={['min-h-11 justify-center rounded-full border px-4 active:opacity-80', box, className].filter(Boolean).join(' ')}
      {...rest}
    >
      <Text variant="label" tone={tone}>
        {label}
      </Text>
    </Pressable>
  );
}
