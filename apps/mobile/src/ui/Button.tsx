// Button — nút có chữ. Cao 48 (md, nút chính) / 44 (sm). Thu nhỏ 0.97 khi nhấn (tắt khi Reduce Motion).
// Biến thể `accent` = Đăng tin (cam, chữ tối). Không cắt chữ (không numberOfLines). Haptic chỉ bật cho
// đăng tin / tham gia nhóm / lưu tin (prop `haptic`). `inverse`: nút trên nền primary (header Hub) — nền surface, chữ
// primary. `glass`: nút trong mờ trên nền primary (Đăng nhập ở header Hub, style Stitch) — nền on-primary/15, viền
// on-primary/30, chữ on-primary. `shape="pill"` bo tròn hẳn (nút trong header / banner).
// `iconOnly` (thanh liên hệ chi tiết tin, style Stitch): nút vuông chỉ icon — 48×48 (md) / 44×44 (sm), `label` thành
// accessibilityLabel; nền secondary / outline thì icon màu primary.
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { AnimatedView } from './interop';
import { Icon } from './Icon';
import { Text, type TextTone } from './Text';
import { useTheme } from './theme';
import { usePressScale } from './usePressScale';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'inverse' | 'glass';
export type ButtonSize = 'md' | 'sm';

const BOX: Record<ButtonVariant, string> = {
  primary: 'bg-primary border-primary',
  accent: 'bg-accent border-accent',
  secondary: 'bg-surface-2 border-surface-2',
  outline: 'bg-surface border-border',
  ghost: 'bg-transparent border-transparent',
  danger: 'bg-danger border-danger',
  inverse: 'bg-surface border-surface',
  glass: 'bg-on-primary/15 border-on-primary/30',
};
const TONE: Record<ButtonVariant, TextTone> = {
  primary: 'onPrimary',
  accent: 'onAccent',
  secondary: 'default',
  outline: 'default',
  ghost: 'primary',
  danger: 'onPrimary',
  inverse: 'primary',
  glass: 'onPrimary',
};
const SIZE: Record<ButtonSize, string> = { md: 'min-h-12 px-5', sm: 'min-h-11 px-4' };
const SQUARE: Record<ButtonSize, string> = { md: 'size-12', sm: 'size-11' };

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  shape?: 'rounded' | 'pill';
  /** Nút vuông chỉ icon (bắt buộc `icon`); `label` dùng làm accessibilityLabel. */
  iconOnly?: boolean;
  className?: string;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  haptic = false,
  shape = 'rounded',
  iconOnly = false,
  disabled,
  onPress,
  className,
  ...rest
}: ButtonProps) {
  const t = useTheme();
  const press = usePressScale();
  const square = iconOnly && !!icon;
  const tone: TextTone = square && (variant === 'secondary' || variant === 'outline') ? 'primary' : TONE[variant];
  const isDisabled = disabled || loading;
  const spinnerColor = tone === 'onPrimary' ? t.colors.onPrimary : tone === 'onAccent' ? t.colors.onAccent : t.colors.primary;

  return (
    <AnimatedView style={press.style} className={fullWidth && !square ? 'self-stretch' : 'self-start'}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={square ? label : undefined}
        accessibilityState={{ disabled: !!isDisabled, busy: loading }}
        disabled={isDisabled}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={(e) => {
          if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.(e);
        }}
        className={[
          'flex-row items-center justify-center gap-2 border',
          shape === 'pill' ? 'rounded-full' : 'rounded-md',
          BOX[variant],
          square ? SQUARE[size] : SIZE[size],
          isDisabled && 'opacity-50',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : icon ? <Icon icon={icon} tone={tone} /> : null}
        {square ? null : (
          <Text variant="label" tone={tone} className="shrink text-center">
            {label}
          </Text>
        )}
      </Pressable>
    </AnimatedView>
  );
}
