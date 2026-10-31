// Card — khối nội dung nền surface, bo md, bóng card (chỉ card và FAB có bóng). Có onPress → nhấn thu nhỏ 0.97.
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

export function Card({ children, onPress, accessibilityLabel, selected, padded = true, className }: CardProps) {
  const press = usePressScale();
  const box = ['rounded-md bg-surface shadow-card', padded && 'p-3', className].filter(Boolean).join(' ');
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
