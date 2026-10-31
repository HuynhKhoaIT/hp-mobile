// Text — chữ duy nhất của app (cấm Text gốc của react-native ngoài file này).
// Variant quyết định cỡ + weight (Android cần một font family cho mỗi weight). Tone quyết định màu token.
// Tiếng Trung: dùng font hệ thống cho tới khi app tải Noto Sans SC (Be Vietnam Pro không có chữ Hán).
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTranslation } from 'react-i18next';

export type TextVariant = 'micro' | 'caption' | 'body' | 'label' | 'title' | 'titleLg' | 'heading' | 'display' | 'price';
/** Đè độ đậm của variant (vd số liệu text-2xl đậm 700, nhãn text-sm 500) — vẫn đúng font cho zh. */
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';
export type TextTone = 'default' | 'muted' | 'disabled' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'onPrimary' | 'onAccent';

const SIZE: Record<TextVariant, string> = {
  micro: 'text-xs', // 12 — chỉ nhãn góc / số đếm / dòng miễn trừ (docs/design/home.md §10), không dùng cho chữ thân
  caption: 'text-sm', // 14 — nhỏ nhất cho nhãn / meta
  body: 'text-md', // 16 — chữ thân tối thiểu
  label: 'text-md',
  title: 'text-lg',
  titleLg: 'text-xl', // 20
  heading: 'text-2xl',
  display: 'text-3xl',
  price: 'text-lg',
};

const FAMILY: Record<TextVariant, string> = {
  micro: 'font-sans',
  caption: 'font-sans',
  body: 'font-sans',
  label: 'font-sans-medium',
  title: 'font-sans-semibold',
  titleLg: 'font-sans-semibold',
  heading: 'font-sans-semibold',
  display: 'font-sans-semibold',
  price: 'font-sans-bold',
};

const WEIGHT_FAMILY: Record<TextWeight, string> = {
  regular: 'font-sans',
  medium: 'font-sans-medium',
  semibold: 'font-sans-semibold',
  bold: 'font-sans-bold',
};
const WEIGHT_ZH: Record<TextWeight, string> = { regular: 'font-normal', medium: 'font-medium', semibold: 'font-semibold', bold: 'font-bold' };

// Font hệ thống cho zh: weight thường đủ dùng vì không có file font riêng.
const ZH_WEIGHT: Record<TextVariant, string> = {
  micro: 'font-normal',
  caption: 'font-normal',
  body: 'font-normal',
  label: 'font-medium',
  title: 'font-semibold',
  titleLg: 'font-semibold',
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
  weight?: TextWeight;
  className?: string;
};

export function Text({ variant = 'body', tone = 'default', weight, className, ...rest }: TextProps) {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const family = weight ? (zh ? WEIGHT_ZH[weight] : WEIGHT_FAMILY[weight]) : zh ? ZH_WEIGHT[variant] : FAMILY[variant];
  return (
    <RNText
      maxFontSizeMultiplier={1.5}
      className={[SIZE[variant], family, TONE[tone], className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
