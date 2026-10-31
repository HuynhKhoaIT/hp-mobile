// FilterBar — hàng chip lọc cuộn ngang (danh mục con…). `leading`: chip khác đặt đầu hàng (vd Select chip "Khu").
// Chip đang chọn có accessibilityState.selected (không chỉ đổi màu).
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { Chip } from './Chip';

export type FilterOption<T extends string> = { value: T; label: string };

export type FilterBarProps<T extends string> = {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  leading?: ReactNode;
  className?: string;
};

export function FilterBar<T extends string>({ options, value, onChange, leading, className }: FilterBarProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      className={['grow-0', className].filter(Boolean).join(' ')}
      contentContainerClassName="gap-2 py-1"
    >
      {leading}
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}
