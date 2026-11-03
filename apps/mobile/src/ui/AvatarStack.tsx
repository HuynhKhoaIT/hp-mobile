// AvatarStack — hàng avatar chồng mép (thành viên nhóm) + ô "+N" khi còn người không hiện. Khớp web `avatar-stack`.
// Avatar thêm vào sau lần hiện đầu (vd chính mình vừa tham gia nhóm) "bay" vào hàng: trượt lên + phóng to theo
// motion.base (spring); Reduce Motion → chỉ fade 150ms. Avatar có sẵn lúc mount không chạy animation.
import { useMemo } from 'react';
import { View } from 'react-native';
import {
  type EntryExitAnimationFunction,
  FadeIn,
  LayoutAnimationConfig,
  LinearTransition,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { formatNumber } from '@/lib/format';
import { Avatar } from './Avatar';
import { AnimatedView } from './interop';
import { Text } from './Text';
import { useReducedMotion, useTheme } from './theme';

export type AvatarStackPerson = { id: string; name: string; uri?: string | null };

export type AvatarStackProps = {
  people: readonly AvatarStackPerson[];
  /** Tổng số người (lớn hơn people.length khi danh sách đã bị cắt, vd members ≤ 8 của public_groups). */
  total?: number;
  /** Số avatar hiện tối đa; phần còn lại gộp vào ô "+N". */
  max?: number;
  size?: 'sm' | 'md';
  /** Chữ ô "+N" (đã dịch, vd t('group:card.members_more', { count })). Mặc định "+N" theo định dạng số. */
  moreLabel?: (count: number) => string;
  /** Câu đọc cho trình đọc màn hình (vd "3 người đã tham gia"); có → cả hàng là một ảnh. */
  accessibilityLabel?: string;
  className?: string;
};

const BOX = { sm: 'h-8 w-8', md: 'h-10 w-10' } as const;

/** Animation "bay vào": trượt lên từ phía nút Tham gia + phóng to, spring motion.base. */
function useFlyIn() {
  const { motion, space } = useTheme();
  const reduced = useReducedMotion();
  return useMemo(() => {
    if (reduced) return FadeIn.duration(motion.reduced.duration);
    const spring = { damping: motion.base.damping, stiffness: motion.base.stiffness };
    const fade = motion.fast.duration;
    const from = space[8];
    const fly: EntryExitAnimationFunction = () => {
      'worklet';
      return {
        initialValues: { opacity: 0, transform: [{ translateY: from }, { scale: 0.4 }] },
        animations: {
          opacity: withTiming(1, { duration: fade }),
          transform: [{ translateY: withSpring(0, spring) }, { scale: withSpring(1, spring) }],
        },
      };
    };
    return fly;
  }, [reduced, motion, space]);
}

export function AvatarStack({ people, total, max = 5, size = 'md', moreLabel, accessibilityLabel, className }: AvatarStackProps) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const flyIn = useFlyIn();
  const count = Math.max(total ?? people.length, people.length);
  // Còn người không hiện → nhường một ô cho "+N".
  const shown = people.slice(0, count > max ? max - 1 : max);
  const more = count - shown.length;
  const layout = reduced ? undefined : LinearTransition.duration(motion.fast.duration);

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      className={['flex-row items-center', className].filter(Boolean).join(' ')}
    >
      <LayoutAnimationConfig skipEntering>
        {shown.map((p, i) => (
          <AnimatedView
            key={p.id}
            entering={flyIn}
            layout={layout}
            importantForAccessibility={accessibilityLabel ? 'no-hide-descendants' : undefined}
            className={['rounded-full border-2 border-surface', i > 0 ? '-ml-2' : ''].join(' ')}
          >
            <Avatar uri={p.uri} name={p.name || '?'} size={size} />
          </AnimatedView>
        ))}
        {more > 0 ? (
          <AnimatedView
            layout={layout}
            importantForAccessibility={accessibilityLabel ? 'no-hide-descendants' : undefined}
            className={['-ml-2 items-center justify-center rounded-full border-2 border-surface bg-surface-2', BOX[size]].join(' ')}
          >
            <Text variant={size === 'sm' ? 'micro' : 'caption'} weight="semibold" tone="muted" numberOfLines={1}>
              {moreLabel ? moreLabel(more) : `+${formatNumber(more)}`}
            </Text>
          </AnimatedView>
        ) : null}
      </LayoutAnimationConfig>
    </View>
  );
}
