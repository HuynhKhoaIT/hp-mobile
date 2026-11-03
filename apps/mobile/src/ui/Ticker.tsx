// Ticker — chữ đổi giá trị có hiệu ứng: giá trị mới trượt xuống vào chỗ (số chỗ còn lại đếm ngược khi có người tham gia).
// Lần hiện đầu không chạy animation; Reduce Motion → chỉ fade 150ms. Không chặn thao tác (animation khi mount).
import { FadeIn, FadeInUp, LayoutAnimationConfig } from 'react-native-reanimated';
import { AnimatedView } from './interop';
import { Text, type TextProps } from './Text';
import { useReducedMotion, useTheme } from './theme';

export type TickerProps = Omit<TextProps, 'children'> & {
  /** Chữ đã định dạng / dịch (vd t('group:card.seats_left', { count })). Đổi giá trị → chạy hiệu ứng. */
  text: string;
};

export function Ticker({ text, ...rest }: TickerProps) {
  const { motion, space } = useTheme();
  const reduced = useReducedMotion();
  const entering = reduced
    ? FadeIn.duration(motion.reduced.duration)
    : FadeInUp.duration(motion.base.duration).withInitialValues({ opacity: 0, transform: [{ translateY: -space[3] }] });
  return (
    <LayoutAnimationConfig skipEntering>
      <AnimatedView key={text} entering={entering} accessibilityLiveRegion="polite">
        <Text {...rest}>{text}</Text>
      </AnimatedView>
    </LayoutAnimationConfig>
  );
}
