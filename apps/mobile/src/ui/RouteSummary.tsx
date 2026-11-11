// RouteSummary — tuyến đường / địa điểm của nhóm ghép khi chưa có bản đồ (chờ key Goong): chấm điểm đi → ghim điểm đến.
// `full` (chi tiết): hai dòng có nhãn ("Điểm đi" / "Điểm đến") nối bằng vạch dọc. `compact`: một dòng "A → B".
// `timeline` (GroupCard, style Stitch "Ghép xe"): chấm primary (điểm đi) — vạch dọc — chấm cam (điểm đến), mỗi điểm một dòng
// chữ đậm 600 (cắt 1 dòng); nhãn chỉ đọc cho trình đọc màn hình. Chỉ có điểm đi → một dòng ghim primary (cắt 2 dòng).
// Chỉ có điểm đi (kèo thể thao: sân) → một dòng ghim. Chữ do người dùng nhập — không dịch; nhãn do nơi gọi truyền (đã dịch).
import { CircleDot, MapPin } from 'lucide-react-native';
import { View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';

export type RouteSummaryProps = {
  from: string;
  to?: string | null;
  /** Nhãn điểm đi (hoặc nhãn địa điểm khi không có điểm đến, vd "Sân"). */
  fromLabel: string;
  toLabel?: string;
  variant?: 'full' | 'compact' | 'timeline';
  className?: string;
};

export function RouteSummary({ from, to, fromLabel, toLabel, variant = 'full', className }: RouteSummaryProps) {
  if (variant === 'timeline') {
    const label = to && toLabel ? `${fromLabel}: ${from}, ${toLabel}: ${to}` : `${fromLabel}: ${from}`;
    if (!to) {
      return (
        <View accessible accessibilityLabel={label} className={['flex-row items-start gap-2', className].filter(Boolean).join(' ')}>
          <Icon icon={MapPin} tone="primary" size={18} />
          <Text variant="label" weight="semibold" numberOfLines={2} className="flex-1">
            {from}
          </Text>
        </View>
      );
    }
    return (
      <View accessible accessibilityLabel={label} className={['flex-row gap-3', className].filter(Boolean).join(' ')}>
        {/* Chấm canh giữa dòng chữ đầu / cuối (dòng text-md ~24: pt / pb 6 + chấm 10). */}
        <View className="items-center py-1.5">
          <View className="size-2.5 rounded-full bg-primary" />
          <View className="my-1 w-0.5 flex-1 rounded-full bg-border" />
          <View className="size-2.5 rounded-full bg-accent" />
        </View>
        <View className="flex-1 gap-2">
          <Text variant="label" weight="semibold" numberOfLines={1}>
            {from}
          </Text>
          <Text variant="label" weight="semibold" numberOfLines={1}>
            {to}
          </Text>
        </View>
      </View>
    );
  }

  if (variant === 'compact') {
    const text = to ? `${from} → ${to}` : from;
    return (
      <View
        accessible
        accessibilityLabel={to && toLabel ? `${fromLabel}: ${from}, ${toLabel}: ${to}` : `${fromLabel}: ${from}`}
        className={['flex-row items-start gap-2', className].filter(Boolean).join(' ')}
      >
        <Icon icon={MapPin} tone="muted" size={16} />
        <Text variant="caption" numberOfLines={2} className="flex-1">
          {text}
        </Text>
      </View>
    );
  }

  if (!to) {
    return (
      <View className={['flex-row items-start gap-3', className].filter(Boolean).join(' ')}>
        <Icon icon={MapPin} tone="danger" />
        <View className="flex-1">
          <Text variant="caption" tone="muted">
            {fromLabel}
          </Text>
          <Text variant="label" selectable>
            {from}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className={['flex-row gap-3', className].filter(Boolean).join(' ')}>
      {/* Cột icon: chấm điểm đi — vạch nối — ghim điểm đến. */}
      <View className="items-center pt-1" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Icon icon={CircleDot} tone="primary" />
        <View className="my-1 w-px flex-1 bg-border" />
        <Icon icon={MapPin} tone="danger" />
      </View>
      <View className="flex-1 gap-4">
        <View>
          <Text variant="caption" tone="muted">
            {fromLabel}
          </Text>
          <Text variant="label" selectable>
            {from}
          </Text>
        </View>
        <View>
          <Text variant="caption" tone="muted">
            {toLabel}
          </Text>
          <Text variant="label" selectable>
            {to}
          </Text>
        </View>
      </View>
    </View>
  );
}
