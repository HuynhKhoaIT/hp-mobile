// IconButton — nút chỉ có icon (đóng, quay lại, chia sẻ…). accessibilityLabel BẮT BUỘC (qua t()).
// Ô hiển thị 44×44, hitSlop mở rộng vùng chạm lên ~52 để dùng một tay.
// `glass`: nút tròn trong mờ trên nền primary (header xanh danh sách tin, style Stitch) — nền on-primary/15, viền
// on-primary/20, icon on-primary.
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, type PressableProps } from 'react-native';
import { AnimatedView } from './interop';
import { Icon } from './Icon';
import type { TextTone } from './Text';
import { usePressScale } from './usePressScale';

export type IconButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  icon: LucideIcon;
  accessibilityLabel: string;
  /** primary: nút tròn nền primary, icon onPrimary (nút Gửi tin nhắn). glass: trong mờ trên nền primary. */
  variant?: 'ghost' | 'filled' | 'primary' | 'glass';
  tone?: TextTone;
  size?: 'button' | 'tab';
  className?: string;
};

export function IconButton({
  icon,
  variant = 'ghost',
  tone = 'default',
  size = 'tab',
  disabled,
  className,
  ...rest
}: IconButtonProps) {
  const press = usePressScale();
  return (
    <AnimatedView style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        hitSlop={4}
        disabled={disabled}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        className={[
          'h-11 w-11 items-center justify-center rounded-full',
          variant === 'filled'
            ? 'bg-surface-2'
            : variant === 'primary'
              ? 'bg-primary'
              : variant === 'glass'
                ? 'border border-on-primary/20 bg-on-primary/15'
                : 'bg-transparent',
          disabled && 'opacity-50',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        <Icon icon={icon} tone={variant === 'primary' || variant === 'glass' ? 'onPrimary' : disabled ? 'disabled' : tone} size={size} />
      </Pressable>
    </AnimatedView>
  );
}
