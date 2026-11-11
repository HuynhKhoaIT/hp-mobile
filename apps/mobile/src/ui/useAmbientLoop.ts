// Chuyển động nền lặp vô hạn, nhịp chậm (t.motion.ambient) — CHỈ dùng cho nút Đăng (`glow`) và nhãn "Mới" (`float`).
// Trả về `progress` 0 → 1 → 0 (một chu kỳ = ambient.<kind>.duration) để component tự map sang opacity / scale / translateY.
// Reduce Motion → tắt hẳn (progress đứng ở 0, không fade thay thế); `enabled=false` → về 0 trong motion.fast.
// Chạy trên UI thread, không chặn thao tác.
import { useEffect } from 'react';
import { cancelAnimation, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { easingOf, useReducedMotion, useTheme } from './theme';

export function useAmbientLoop(kind: 'glow' | 'float', enabled = true) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const { duration, easing } = motion.ambient[kind];
  const active = enabled && !reduced;

  useEffect(() => {
    if (!active) {
      cancelAnimation(progress);
      progress.set(reduced ? 0 : withTiming(0, { duration: motion.fast.duration }));
      return;
    }
    progress.set(withRepeat(withTiming(1, { duration: duration / 2, easing: easingOf(easing) }), -1, true));
    return () => cancelAnimation(progress);
  }, [active, reduced, duration, easing, motion.fast.duration, progress]);

  return { progress, active };
}
