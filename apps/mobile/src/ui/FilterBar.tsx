// FilterBar — hàng chip lọc cuộn ngang (danh mục con…). `leading`: chip khác đặt đầu hàng (vd Select chip "Khu").
// Chip đang chọn có accessibilityState.selected (không chỉ đổi màu).
// Option có `count` → số đếm trong pill sau chữ. `appearance` truyền xuống Chip ('solid': hàng trạng thái "Tin của
// tôi"). `bleed`: hàng tràn mép màn (bù padding ngang 16 của Screen, nội dung vẫn thẳng lề 16).
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { Chip } from './Chip';

export type FilterOption<T extends string> = { value: T; label: string; count?: number };

export type FilterBarProps<T extends string> = {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  leading?: ReactNode;
  appearance?: 'soft' | 'solid';
  /** Tràn mép màn: -mx-4 + nội dung px-4 (đặt trong vùng có padding ngang 16). */
  bleed?: boolean;
  className?: string;
};

export function FilterBar<T extends string>({
  options,
  value,
  onChange,
  leading,
  appearance = 'soft',
  bleed = false,
  className,
}: FilterBarProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      className={['grow-0', bleed && '-mx-4', className].filter(Boolean).join(' ')}
      contentContainerClassName={['gap-2 py-1', bleed && 'px-4'].filter(Boolean).join(' ')}
    >
      {leading}
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          count={o.count}
          appearance={appearance}
          selected={o.value === value}
          onPress={() => onChange(o.value)}
        />
      ))}
    </ScrollView>
  );
}
