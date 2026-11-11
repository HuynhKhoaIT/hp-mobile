// useTheme(): giá trị token cho nơi không nhận className (Reanimated, icon Lucide, thư viện ngoài).
// Màu đọc theo giao diện đang dùng (sáng / tối). Không khai báo token ở đây — mọi giá trị từ @hp/tokens.
import { colors, font, gradients, hitTarget, icon, motion, radius, serviceColors, shadow, shimmer, space } from '@hp/tokens';
import { useColorScheme } from 'nativewind';
import { Easing, type EasingFunction, useReducedMotion } from 'react-native-reanimated';

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
    /** Màu giữa của dải sáng skeleton (rgba, theo sáng / tối). */
    shimmer: shimmer[scheme],
    motion,
    hitTarget,
    icon,
  };
}

export type Theme = ReturnType<typeof useTheme>;

/** Bật Reduce Motion → animation chỉ fade `motion.reduced` (150ms). */
export { useReducedMotion };

/** Easing dạng timing có trong token motion ('spring' của motion.base dùng withSpring). */
export type TimingEasing = 'ease-out' | 'ease-in-out';

const EASING: Record<TimingEasing, EasingFunction> = {
  'ease-out': Easing.out(Easing.ease),
  'ease-in-out': Easing.inOut(Easing.ease),
};

/** Easing của token (`t.motion.*.easing`, trừ 'spring') → hàm Easing của Reanimated cho withTiming. */
export function easingOf(name: TimingEasing): EasingFunction {
  return EASING[name];
}
