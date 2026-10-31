// Input — ô nhập có nhãn, gợi ý, lỗi. Cao 48, chữ 16 (font Be Vietnam Pro), bo `rounded-sm`.
// Lỗi hiện bằng chữ (không chỉ đổi màu viền) và đọc được bằng trình đọc màn hình.
import type { LucideIcon } from 'lucide-react-native';
import { type ComponentRef, type Ref, useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';
import { useTheme } from './theme';

export type InputProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label?: string;
  hint?: string;
  /** Câu lỗi đã dịch; có giá trị → viền đỏ + đọc lỗi. */
  error?: string | null;
  icon?: LucideIcon;
  /** Chữ cố định cuối ô (vd ₫). */
  suffix?: string;
  className?: string;
  /** React 19: ref là prop thường. */
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

export function Input({
  label,
  hint,
  error,
  icon,
  suffix,
  editable = true,
  className,
  onFocus,
  onBlur,
  accessibilityLabel,
  ref,
  ...rest
}: InputProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const border = error ? 'border-danger' : focused ? 'border-primary' : 'border-border';

  return (
    <View className="gap-2">
      {label ? <Text variant="label">{label}</Text> : null}
      <View
        className={[
          'min-h-12 flex-row items-center gap-2 rounded-sm border px-3',
          border,
          editable ? 'bg-surface' : 'bg-surface-2',
        ].join(' ')}
      >
        {icon ? <Icon icon={icon} tone="muted" /> : null}
        <TextInput
          ref={ref}
          editable={editable}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={error ?? hint}
          maxFontSizeMultiplier={1.5}
          placeholderTextColor={t.colors.textDisabled}
          selectionColor={t.colors.primary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={['min-h-12 flex-1 py-3 font-sans text-md text-fg', className].filter(Boolean).join(' ')}
          {...rest}
        />
        {suffix ? <Text tone="muted">{suffix}</Text> : null}
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
