// Chip — lựa chọn dạng viên thuốc (filter, ngôn ngữ, giao diện). Vùng chạm tối thiểu 44 (nút phụ).
// selected đổi viền + nền + màu chữ, kèm accessibilityState để không truyền tải chỉ bằng màu.
// size 'sm' (chip "Tìm nhanh" ở Hub, docs/design/home.md §10): cao 40, px-3, chữ text-sm 500, hitSlop 4 → vùng chạm 48;
// `dot` thêm chấm màu dịch vụ size-2 bên trái chữ. Nhấn: nền surface-2.
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, type PressableProps, View } from 'react-native';
import { Icon } from './Icon';
import { SERVICE, type ServiceKey } from './service';
import { Text } from './Text';

export type ChipProps = Omit<PressableProps, 'children'> & {
  label: string;
  selected?: boolean;
  size?: 'md' | 'sm';
  /** Chấm màu dịch vụ trước chữ. */
  dot?: ServiceKey;
  /** Icon sau chữ (vd ChevronDown khi chip mở danh sách chọn, X khi bỏ lọc). */
  trailingIcon?: LucideIcon;
  className?: string;
};

export function Chip({ label, selected = false, size = 'md', dot, trailingIcon, disabled, className, ...rest }: ChipProps) {
  const tone = disabled ? 'disabled' : selected ? 'primary' : 'default';
  const box = selected ? 'border-primary bg-primary-light' : 'border-border bg-surface';
  const sizing = size === 'sm' ? 'min-h-10 gap-2 px-3 active:bg-surface-2' : 'min-h-11 gap-1 px-4 active:opacity-80';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={size === 'sm' ? 4 : undefined}
      className={['flex-row items-center justify-center rounded-full border', sizing, box, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {dot ? <View className={`size-2 rounded-full ${SERVICE[dot].dot}`} /> : null}
      {size === 'sm' ? (
        <Text variant="caption" weight="medium" tone={tone}>
          {label}
        </Text>
      ) : (
        <Text variant="label" tone={tone}>
          {label}
        </Text>
      )}
      {trailingIcon ? <Icon icon={trailingIcon} tone={tone} size={size === 'sm' ? 16 : 'button'} /> : null}
    </Pressable>
  );
}
