// LogoMark — biểu tượng app (giống web `components/shared/logo.tsx`): ô primary bo góc + ghim vị trí on-primary + chấm
// accent góc trên phải (= "quanh khu làm việc"). Không dùng logo / nhận diện Hòa Phát. Trang trí: ẩn với trình đọc màn
// hình (tên app đọc từ chữ đi kèm). size 'sm' ô size-8 rounded-md icon 20 · 'lg' (hero màn đăng nhập, style Stitch) ô
// size-14 rounded-lg icon 28 + bóng card.
import { MapPin } from 'lucide-react-native';
import { View } from 'react-native';
import { Icon } from './Icon';

const LOOK = {
  sm: { box: 'size-8 rounded-md', dot: 'size-2.5 -right-0.5 -top-0.5', icon: 20 },
  lg: { box: 'size-14 rounded-lg shadow-card', dot: 'size-3.5 -right-1 -top-1', icon: 28 },
} as const;

export function LogoMark({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const look = LOOK[size];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`items-center justify-center bg-primary ${look.box}`}
    >
      <Icon icon={MapPin} tone="onPrimary" size={look.icon} strong />
      <View className={`absolute rounded-full border-2 border-surface bg-accent ${look.dot}`} />
    </View>
  );
}
