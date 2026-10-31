// AlertRow — một hàng cảnh báo bấm được trong thẻ (vd "2 tin sắp hết hạn" ở thẻ "Tin của bạn", docs/design/home.md §10):
// hàng rounded-lg px-3 py-2 chữ text-sm; warning: nền warning/10 + Clock 16 màu warning; danger: nền danger/10 +
// CircleAlert 16 màu danger; ChevronRight cuối hàng. Có chữ (không chỉ màu). Cao ≥ 44 (vùng chạm phụ).
import { ChevronRight, CircleAlert, Clock, type LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';

export type AlertRowTone = 'warning' | 'danger';

const BOX: Record<AlertRowTone, string> = { warning: 'bg-warning/10', danger: 'bg-danger/10' };
const ICON: Record<AlertRowTone, LucideIcon> = { warning: Clock, danger: CircleAlert };

export type AlertRowProps = {
  label: string;
  tone?: AlertRowTone;
  icon?: LucideIcon;
  onPress: () => void;
  className?: string;
};

export function AlertRow({ label, tone = 'warning', icon, onPress, className }: AlertRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={['min-h-11 flex-row items-center gap-2 rounded-lg px-3 py-2 active:opacity-80', BOX[tone], className].filter(Boolean).join(' ')}
    >
      <Icon icon={icon ?? ICON[tone]} tone={tone} size={16} />
      <Text variant="caption" className="flex-1">
        {label}
      </Text>
      <Icon icon={ChevronRight} tone="muted" size={16} />
    </Pressable>
  );
}
