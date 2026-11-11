// Icon — Lucide duy nhất (không trộn bộ khác). Kích thước: 'button' 20, 'tab' 24; nét 1.75; màu theo tone token.
// Icon trang trí ẩn khỏi trình đọc màn hình; nút chỉ có icon phải đặt accessibilityLabel ở nút (IconButton).
// `service` (pass, room…) tô màu nhận diện dịch vụ (t.serviceColors.<key>.fg) thay cho tone. `filled`: tô kín bằng cùng màu
// (vd sao đã chọn của StarRating). `strong`: nét đậm hơn 1 bậc (×1,25 — tab đang mở, nút Đăng).
import type { LucideIcon } from 'lucide-react-native';
import { Platform } from 'react-native';
import type { TextTone } from './Text';
import type { ServiceKey } from './service';
import { type Theme, useTheme } from './theme';

// Ẩn khỏi trình đọc màn hình. SVG trên web (react-native-svg) không hiểu prop accessibility của RN → dùng aria-hidden.
const HIDDEN =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as const)
    : ({ accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const);

const COLOR: Record<TextTone, (c: Theme['colors']) => string> = {
  default: (c) => c.text,
  muted: (c) => c.textMuted,
  disabled: (c) => c.textDisabled,
  primary: (c) => c.primary,
  accent: (c) => c.accent,
  success: (c) => c.success,
  warning: (c) => c.warning,
  danger: (c) => c.danger,
  onPrimary: (c) => c.onPrimary,
  onAccent: (c) => c.onAccent,
};

export type IconProps = {
  icon: LucideIcon;
  size?: 'button' | 'tab' | number;
  tone?: TextTone;
  service?: ServiceKey;
  filled?: boolean;
  strong?: boolean;
};

export function Icon({ icon: Glyph, size = 'button', tone = 'default', service, filled = false, strong = false }: IconProps) {
  const t = useTheme();
  const px = typeof size === 'number' ? size : t.icon[size];
  const color = service ? t.serviceColors[service].fg : COLOR[tone](t.colors);
  return (
    <Glyph
      size={px}
      strokeWidth={strong ? t.icon.strokeWidth * 1.25 : t.icon.strokeWidth}
      color={color}
      fill={filled ? color : 'none'}
      {...HIDDEN}
    />
  );
}
