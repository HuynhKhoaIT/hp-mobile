// Chip — lựa chọn dạng viên thuốc (filter, ngôn ngữ, giao diện). Vùng chạm tối thiểu 44 (nút phụ).
// selected đổi viền + nền + màu chữ, kèm accessibilityState để không truyền tải chỉ bằng màu.
// size 'sm' (chip "Tìm nhanh" ở Hub, docs/design/home.md §10): cao 40, px-3.5, chữ text-sm 500, hitSlop 4 → vùng chạm 48;
// `dot` thêm chấm size-2 bên trái chữ: màu dịch vụ (ServiceKey) hoặc 'accent' (cam — chip "Tìm nhanh" ở Hub, style
// Stitch). Nhấn: nền surface-2.
// `appearance` 'solid' (hàng trạng thái "Tin của tôi", style Stitch): chọn → nền primary chữ on-primary; chưa chọn → nền
// surface viền border chữ muted. `count`: số đếm trong pill sau chữ (text-xs đậm; pill on-primary/20 khi chọn solid,
// surface-2 khi chưa chọn).
// `onRemove` (lịch sử tìm kiếm ở màn Bộ lọc mini-app): chip có nút × riêng ở cuối — chạm chữ chạy `onPress`, chạm × chạy
// `onRemove` (hai nút anh em, trình đọc màn hình tới được từng nút; nhãn × bắt buộc qua `removeAccessibilityLabel`).
import { type LucideIcon, X } from 'lucide-react-native';
import { Pressable, type PressableProps, View } from 'react-native';
import { Icon } from './Icon';
import { SERVICE, type ServiceKey } from './service';
import { Text, type TextTone } from './Text';

export type ChipProps = Omit<PressableProps, 'children'> & {
  label: string;
  selected?: boolean;
  size?: 'md' | 'sm';
  /** 'soft' (mặc định): chọn → nền primary-light. 'solid': chọn → nền primary đặc, chữ on-primary. */
  appearance?: 'soft' | 'solid';
  /** Số đếm trong pill sau chữ (vd số tin của trạng thái). */
  count?: number;
  /** Chấm màu trước chữ: màu dịch vụ hoặc 'accent'. */
  dot?: ServiceKey | 'accent';
  /** Icon sau chữ (vd ChevronDown khi chip mở danh sách chọn, X khi bỏ lọc). */
  trailingIcon?: LucideIcon;
  /** Nút × riêng ở cuối chip (vd xoá một từ khoá khỏi lịch sử). */
  onRemove?: () => void;
  removeAccessibilityLabel?: string;
  className?: string;
};

function chipLook(selected: boolean, disabled: boolean, appearance: 'soft' | 'solid'): { tone: TextTone; box: string; pill: string } {
  if (appearance === 'solid') {
    if (disabled) return { tone: 'disabled', box: 'border-border bg-surface', pill: 'bg-surface-2' };
    return selected
      ? { tone: 'onPrimary', box: 'border-primary bg-primary', pill: 'bg-on-primary/20' }
      : { tone: 'muted', box: 'border-border bg-surface', pill: 'bg-surface-2' };
  }
  return {
    tone: disabled ? 'disabled' : selected ? 'primary' : 'default',
    box: selected ? 'border-primary bg-primary-light' : 'border-border bg-surface',
    pill: selected ? 'bg-primary/10' : 'bg-surface-2',
  };
}

export function Chip({
  label,
  selected = false,
  size = 'md',
  appearance = 'soft',
  count,
  dot,
  trailingIcon,
  onRemove,
  removeAccessibilityLabel,
  disabled,
  className,
  ...rest
}: ChipProps) {
  const { tone, box, pill } = chipLook(selected, !!disabled, appearance);
  const sizing = size === 'sm' ? 'min-h-10 gap-2 px-3.5 active:bg-surface-2' : 'min-h-11 gap-1 px-4 active:opacity-80';
  if (onRemove) {
    return (
      <View className={['flex-row items-center rounded-full border', box, className].filter(Boolean).join(' ')}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected, disabled: !!disabled }}
          disabled={disabled}
          hitSlop={size === 'sm' ? 4 : undefined}
          className={['flex-row items-center justify-center rounded-full pr-1', size === 'sm' ? 'min-h-10 pl-3.5 active:bg-surface-2' : 'min-h-11 pl-4 active:opacity-80'].join(' ')}
          {...rest}
        >
          <Text variant={size === 'sm' ? 'caption' : 'label'} weight="medium" tone={tone}>
            {label}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={removeAccessibilityLabel}
          onPress={onRemove}
          hitSlop={6}
          className={['items-center justify-center rounded-full pr-2.5 pl-1 active:opacity-70', size === 'sm' ? 'min-h-10' : 'min-h-11'].join(' ')}
        >
          <Icon icon={X} tone="muted" size={16} />
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={size === 'sm' ? 4 : undefined}
      className={['flex-row items-center justify-center rounded-full border', sizing, box, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {dot ? <View className={`size-2 rounded-full ${dot === 'accent' ? 'bg-accent' : SERVICE[dot].dot}`} /> : null}
      {size === 'sm' ? (
        <Text variant="caption" weight="medium" tone={tone}>
          {label}
        </Text>
      ) : (
        <Text variant="label" tone={tone} weight={appearance === 'solid' ? 'semibold' : undefined}>
          {label}
        </Text>
      )}
      {count !== undefined ? (
        <View className={`ml-1 min-w-6 items-center rounded-full px-1.5 py-0.5 ${pill}`}>
          <Text variant="micro" weight="bold" tone={tone} maxFontSizeMultiplier={1.3}>
            {count}
          </Text>
        </View>
      ) : null}
      {trailingIcon ? <Icon icon={trailingIcon} tone={tone} size={size === 'sm' ? 16 : 'button'} /> : null}
    </Pressable>
  );
}
