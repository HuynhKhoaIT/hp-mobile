// Text — chữ duy nhất của app (cấm Text gốc của react-native ngoài file này).
// Variant quyết định cỡ + weight (Android cần một font family cho mỗi weight). Tone quyết định màu token.
// Tiếng Trung: dùng font hệ thống cho tới khi app tải Noto Sans SC (Be Vietnam Pro không có chữ Hán).
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTranslation } from 'react-i18next';

export type TextVariant = 'caption' | 'body' | 'label' | 'title' | 'heading' | 'display' | 'price';
export type TextTone = 'default' | 'muted' | 'disabled' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'onPrimary' | 'onAccent';

const SIZE: Record<TextVariant, string> = {
  caption: 'text-sm', // 14 — nhỏ nhất cho nhãn / meta
  body: 'text-md', // 16 — chữ thân tối thiểu
  label: 'text-md',
  title: 'text-lg',
  heading: 'text-2xl',
  display: 'text-3xl',
  price: 'text-lg',
};

const FAMILY: Record<TextVariant, string> = {
  caption: 'font-sans',
  body: 'font-sans',
  label: 'font-sans-medium',
  title: 'font-sans-semibold',
  heading: 'font-sans-semibold',
  display: 'font-sans-semibold',
  price: 'font-sans-bold',
};

// Font hệ thống cho zh: weight thường đủ dùng vì không có file font riêng.
const ZH_WEIGHT: Record<TextVariant, string> = {
  caption: 'font-normal',
  body: 'font-normal',
  label: 'font-medium',
  title: 'font-semibold',
  heading: 'font-semibold',
  display: 'font-semibold',
  price: 'font-bold',
};

const TONE: Record<TextTone, string> = {
  default: 'text-fg',
  muted: 'text-muted',
  disabled: 'text-disabled',
  primary: 'text-primary',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  onPrimary: 'text-on-primary',
  onAccent: 'text-on-accent',
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  className?: string;
};

export function Text({ variant = 'body', tone = 'default', className, ...rest }: TextProps) {
  const { i18n } = useTranslation();
  const family = i18n.language === 'zh' ? ZH_WEIGHT[variant] : FAMILY[variant];
  return (
    <RNText
      maxFontSizeMultiplier={1.5}
      className={[SIZE[variant], family, TONE[tone], className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
