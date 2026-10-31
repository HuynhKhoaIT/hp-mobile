// Số liệu — hai dạng dùng ở Hub (docs/design/home.md §10):
// StatColumns: các cột số trong một thẻ (thẻ "Tin của bạn") — số text-2xl đậm 700, nhãn text-sm muted, ngăn cột
//   border-l border-border; tone 'warning' tô số (vd chờ duyệt > 0) — nhãn chữ vẫn nói rõ nghĩa (không chỉ màu).
// StatTile: một ô số độc lập (số liệu cộng đồng) — nền surface bo lg shadow-card p-3, số text-xl đậm primary.
// Trình đọc màn hình đọc "số nhãn" thành một mục.
import { View } from 'react-native';
import { Text } from './Text';

export type StatItem = { value: string; label: string; tone?: 'default' | 'warning' };

export function StatColumns({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <View className={['flex-row', className].filter(Boolean).join(' ')}>
      {items.map((item, i) => (
        <View
          key={item.label}
          accessible
          accessibilityLabel={`${item.value} ${item.label}`}
          className={['flex-1 items-center gap-0.5 px-2', i > 0 ? 'border-l border-border' : ''].join(' ')}
        >
          <Text variant="heading" weight="bold" tone={item.tone === 'warning' ? 'warning' : 'default'}>
            {item.value}
          </Text>
          <Text variant="caption" tone="muted" className="text-center">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function StatTile({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label}`}
      className={['items-center gap-0.5 rounded-lg bg-surface p-3 shadow-card', className].filter(Boolean).join(' ')}
    >
      <Text variant="titleLg" weight="bold" tone="primary" className="text-center">
        {value}
      </Text>
      <Text variant="caption" tone="muted" className="text-center">
        {label}
      </Text>
    </View>
  );
}
