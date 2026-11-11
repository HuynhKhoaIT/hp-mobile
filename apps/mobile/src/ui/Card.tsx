// Card — khối nội dung kiểu Stitch: nền surface, bo lg (16), viền hairline border + bóng card rất nhạt, padding 16.
// Có onPress → nhấn thu nhỏ 0.97. `selected` (card chọn được): viền 2 — primary khi chọn, border khi chưa.
// className có màu viền riêng (vd `border border-primary`) → bỏ màu viền mặc định (NativeWind không gộp class trùng).
// Không đặt overflow-hidden ở đây: iOS cắt mất bóng; ảnh tràn mép tự bo góc trên (rounded-t-lg).
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AnimatedView } from './interop';
import { usePressScale } from './usePressScale';

export type CardProps = {
  children?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Card chọn được (vd ô dịch vụ ở bước chọn loại tin). */
  selected?: boolean;
  /** false: bỏ padding (ảnh tràn mép như ListingCard). */
  padded?: boolean;
  className?: string;
};

const CUSTOM_BORDER = /(^|\s)border-(primary|accent|success|warning|danger|transparent|fg|muted)(\/\d+)?(\s|$)/;

function borderOf(selected: boolean | undefined, className: string | undefined) {
  if (selected !== undefined) return selected ? 'border-2 border-primary' : 'border-2 border-border';
  if (className && CUSTOM_BORDER.test(className)) return '';
  return 'border border-border';
}

export function Card({ children, onPress, accessibilityLabel, selected, padded = true, className }: CardProps) {
  const press = usePressScale();
  const box = ['rounded-lg bg-surface shadow-card', borderOf(selected, className), padded && 'p-4', className]
    .filter(Boolean)
    .join(' ');
  if (!onPress) return <View className={box}>{children}</View>;
  return (
    <AnimatedView style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={selected === undefined ? undefined : { selected }}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        className={box}
      >
        {children}
      </Pressable>
    </AnimatedView>
  );
}
