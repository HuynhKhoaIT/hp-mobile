// OtpInput — ô mã xác nhận dạng hàng ô số (style Stitch "Nhập mã OTP"). Một TextInput thật phủ trong suốt lên cả hàng ô
// → giữ tự điền mã từ tin nhắn (iOS oneTimeCode, Android sms-otp), dán cả mã, bàn phím số; các ô chỉ hiển thị và ẩn với
// trình đọc màn hình (trình đọc màn hình đọc ô nhập thật với nhãn `label`).
// Ô: flex-1 tối đa w-12, min-h-14, rounded-md, chữ text-2xl đậm primary. Trạng thái: đã nhập (viền primary/40), ô đang
// nhập (viền primary + vạch con trỏ đứng yên — không animation khi đang nhập), trống (viền border), lỗi (viền danger +
// câu lỗi dưới, đọc qua live region), tắt (mờ 50%).
import { type ComponentRef, type Ref, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from './theme';

export type OtpInputProps = {
  value: string;
  /** Chỉ nhận chữ số (đã lọc), tối đa `length`. */
  onChange: (digits: string) => void;
  length?: number;
  /** Nhãn đọc cho trình đọc màn hình (đã dịch). */
  label: string;
  /** Câu lỗi đã dịch. */
  error?: string | null;
  editable?: boolean;
  autoFocus?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

function cellLook(filled: boolean, active: boolean, error: boolean) {
  if (error) return 'border-2 border-danger';
  if (active) return 'border-2 border-primary';
  if (filled) return 'border-2 border-primary/40';
  return 'border border-border';
}

export function OtpInput({ value, onChange, length = 6, label, error, editable = true, autoFocus, ref }: OtpInputProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const digits = value.slice(0, length);

  return (
    <View className="gap-2">
      <View className={['flex-row justify-center gap-2', editable ? '' : 'opacity-50'].join(' ')}>
        {Array.from({ length }, (_, i) => {
          const char = digits[i];
          const active = focused && editable && i === digits.length;
          return (
            <View
              key={i}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className={[
                'min-h-14 max-w-12 flex-1 items-center justify-center rounded-md bg-surface shadow-card',
                cellLook(!!char, active, !!error),
              ].join(' ')}
            >
              {char ? (
                <Text variant="heading" weight="bold" tone={error ? 'danger' : 'primary'} maxFontSizeMultiplier={1.3}>
                  {char}
                </Text>
              ) : active ? (
                <View className="h-6 w-0.5 rounded-full bg-primary" />
              ) : (
                <View className="size-1.5 rounded-full bg-border" />
              )}
            </View>
          );
        })}
        <TextInput
          ref={ref}
          value={digits}
          onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
          editable={editable}
          autoFocus={autoFocus}
          keyboardType="number-pad"
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          maxLength={length}
          caretHidden
          selectionColor={t.colors.primary}
          accessibilityLabel={label}
          accessibilityHint={error ?? undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 text-md opacity-0"
        />
      </View>
      {error ? (
        <Text variant="caption" tone="danger" className="text-center" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
