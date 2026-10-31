// Icon — Lucide duy nhất (không trộn bộ khác). Kích thước: 'button' 20, 'tab' 24; nét 1.75; màu theo tone token.
// Icon trang trí ẩn khỏi trình đọc màn hình; nút chỉ có icon phải đặt accessibilityLabel ở nút (IconButton).
// `service` (pass, room…) tô màu nhận diện dịch vụ (t.serviceColors.<key>.fg) thay cho tone.
import type { LucideIcon } from 'lucide-react-native';
import type { TextTone } from './Text';
import type { ServiceKey } from './service';
import { type Theme, useTheme } from './theme';

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
};

export function Icon({ icon: Glyph, size = 'button', tone = 'default', service }: IconProps) {
  const t = useTheme();
  const px = typeof size === 'number' ? size : t.icon[size];
  return (
    <Glyph
      size={px}
      strokeWidth={t.icon.strokeWidth}
      color={service ? t.serviceColors[service].fg : COLOR[tone](t.colors)}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
