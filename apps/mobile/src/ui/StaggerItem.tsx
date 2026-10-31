// StaggerItem — item danh sách hiện lần lượt khi tải xong: fade + trượt lên 8, cách nhau 30ms, chỉ 8 item đầu
// (t.motion.stagger). Reduce Motion → chỉ fade 150ms. Không chặn thao tác (animation khi mount).
import type { ReactNode } from 'react';
import { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AnimatedView } from './interop';
import { useReducedMotion, useTheme } from './theme';

export function StaggerItem({ index, children, className }: { index: number; children: ReactNode; className?: string }) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  if (index >= motion.stagger.maxItems) return <AnimatedView className={className}>{children}</AnimatedView>;
  const entering = reduced
    ? FadeIn.duration(motion.reduced.duration)
    : FadeInDown.duration(motion.fast.duration)
        .delay(index * motion.stagger.delay)
        .withInitialValues({ opacity: 0, transform: [{ translateY: motion.stagger.translateY }] });
  return (
    <AnimatedView entering={entering} className={className}>
      {children}
    </AnimatedView>
  );
}
