// useTheme(): giá trị token cho nơi không nhận className (Reanimated, icon Lucide, thư viện ngoài).
// Màu đọc theo giao diện đang dùng (sáng / tối). Không khai báo token ở đây — mọi giá trị từ @hp/tokens.
import { colors, font, gradients, hitTarget, icon, motion, radius, serviceColors, shadow, space } from '@hp/tokens';
import { useColorScheme } from 'nativewind';
import { useReducedMotion } from 'react-native-reanimated';

export type Scheme = 'light' | 'dark';

export function useScheme(): Scheme {
  return useColorScheme().colorScheme === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  const scheme = useScheme();
  return {
    scheme,
    colors: colors[scheme],
    serviceColors: serviceColors[scheme],
    gradients,
    space,
    radius,
    font,
    shadow,
    motion,
    hitTarget,
    icon,
  };
}

export type Theme = ReturnType<typeof useTheme>;

/** Bật Reduce Motion → animation chỉ fade `motion.reduced` (150ms). */
export { useReducedMotion };
