// Nhấn → thu nhỏ 0.97 (mặc định t.motion.instant; ô dịch vụ ở Hub dùng 'fast'), thả → về 1. Bật Reduce Motion → không đổi kích thước.
// Dùng chung cho Button, IconButton, Card onPress (feature không tự làm lại).
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReducedMotion, useTheme } from './theme';

export function usePressScale(speed: 'instant' | 'fast' = 'instant') {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return {
    style,
    onPressIn: () => {
      if (!reduced) scale.set(withTiming(0.97, { duration: motion[speed].duration }));
    },
    onPressOut: () => {
      scale.set(withTiming(1, { duration: motion[speed].duration }));
    },
  };
}
