// Button — nút có chữ. Cao 48 (md, nút chính) / 44 (sm). Thu nhỏ 0.97 khi nhấn (tắt khi Reduce Motion).
// Biến thể `accent` = Đăng tin (cam, chữ tối). Không cắt chữ (không numberOfLines). Haptic chỉ bật cho
// đăng tin / tham gia nhóm / lưu tin (prop `haptic`).
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { AnimatedView } from './interop';
import { Icon } from './Icon';
import { Text, type TextTone } from './Text';
import { useTheme } from './theme';
import { usePressScale } from './usePressScale';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const BOX: Record<ButtonVariant, string> = {
  primary: 'bg-primary border-primary',
  accent: 'bg-accent border-accent',
  secondary: 'bg-surface-2 border-surface-2',
  outline: 'bg-surface border-border',
  ghost: 'bg-transparent border-transparent',
  danger: 'bg-danger border-danger',
};
const TONE: Record<ButtonVariant, TextTone> = {
  primary: 'onPrimary',
  accent: 'onAccent',
  secondary: 'default',
  outline: 'default',
  ghost: 'primary',
  danger: 'onPrimary',
};
const SIZE: Record<ButtonSize, string> = { md: 'min-h-12 px-5', sm: 'min-h-11 px-4' };

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
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
  disabled,
  onPress,
  className,
  ...rest
}: ButtonProps) {
  const t = useTheme();
  const press = usePressScale();
  const tone = TONE[variant];
  const isDisabled = disabled || loading;
  const spinnerColor = tone === 'onPrimary' ? t.colors.onPrimary : tone === 'onAccent' ? t.colors.onAccent : t.colors.primary;

  return (
    <AnimatedView style={press.style} className={fullWidth ? 'self-stretch' : 'self-start'}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!isDisabled, busy: loading }}
        disabled={isDisabled}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={(e) => {
          if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.(e);
        }}
        className={[
          'flex-row items-center justify-center gap-2 rounded-md border',
          BOX[variant],
          SIZE[size],
          isDisabled && 'opacity-50',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : icon ? <Icon icon={icon} tone={tone} /> : null}
        <Text variant="label" tone={tone} className="text-center">
          {label}
        </Text>
      </Pressable>
    </AnimatedView>
  );
}
