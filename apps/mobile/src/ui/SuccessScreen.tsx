// SuccessScreen — màn kết quả sau một thao tác lớn (đăng tin): biểu tượng trong vòng tròn tông màu, tiêu đề, mô tả,
// nội dung thêm (vd lý do chờ duyệt), một nút chính + các nút phụ. Biểu tượng hiện bằng phóng to + mờ dần
// (Reduce Motion → chỉ mờ dần 150ms). `celebrate`: thay biểu tượng bằng dấu tích Lottie (tải lười, không chặn nút);
// Reduce Motion → vẫn biểu tượng tĩnh. Tone success: thêm MỘT vòng lan (t.motion.ripple: sau 200ms, viền success phóng
// 1 → 1.6 và mờ dần trong 900ms, không lặp) quanh dấu tích — khớp web FormResult; Reduce Motion → không vòng.
import { CheckCircle2, CircleAlert, Clock, type LucideIcon } from 'lucide-react-native';
import { lazy, type ReactNode, Suspense, useEffect } from 'react';
import { View } from 'react-native';
import { cancelAnimation, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withTiming, ZoomIn } from 'react-native-reanimated';
import { Button } from './Button';
import { Icon } from './Icon';
import { AnimatedView } from './interop';
import { Text } from './Text';
import { easingOf, useReducedMotion, useTheme } from './theme';

const SuccessCheckAnimation = lazy(() => import('./SuccessCheckAnimation'));

/** Vòng lan một lần quanh biểu tượng thành công (trang trí, không nhận chạm). Chỉ mount khi không bật Reduce Motion. */
function SuccessRipple() {
  const { motion } = useTheme();
  const { duration, delay, easing, scale, opacity } = motion.ripple;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(delay, withTiming(1, { duration, easing: easingOf(easing) })));
    return () => cancelAnimation(progress);
  }, [delay, duration, easing, progress]);
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return { opacity: p > 0 ? opacity * (1 - p) : 0, transform: [{ scale: 1 + (scale - 1) * p }] };
  });
  return <AnimatedView pointerEvents="none" style={style} className="absolute inset-0 rounded-full border-2 border-success" />;
}

export type SuccessTone = 'success' | 'warning' | 'danger';

const BOX: Record<SuccessTone, string> = { success: 'bg-success/15', warning: 'bg-warning/15', danger: 'bg-danger/15' };
const ICON: Record<SuccessTone, LucideIcon> = { success: CheckCircle2, warning: Clock, danger: CircleAlert };

export type SuccessScreenProps = {
  tone?: SuccessTone;
  icon?: LucideIcon;
  /** Đăng tin thành công: dấu tích Lottie thay biểu tượng. */
  celebrate?: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  primary: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void }[];
};

export function SuccessScreen({ tone = 'success', icon, celebrate = false, title, description, children, primary, secondary = [] }: SuccessScreenProps) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const entering = reduced ? FadeIn.duration(motion.reduced.duration) : ZoomIn.duration(motion.slow.duration);
  return (
    <View className="flex-1 justify-center gap-6 py-8">
      <View accessibilityRole="summary" className="items-center gap-3">
        <AnimatedView entering={entering} className={`h-20 w-20 items-center justify-center rounded-full ${BOX[tone]}`}>
          {tone === 'success' && !reduced ? <SuccessRipple /> : null}
          {celebrate && !reduced ? (
            <Suspense fallback={null}>
              <SuccessCheckAnimation />
            </Suspense>
          ) : (
            <Icon icon={icon ?? ICON[tone]} tone={tone} size={40} />
          )}
        </AnimatedView>
        <Text variant="heading" accessibilityRole="header" className="text-center">
          {title}
        </Text>
        {description ? (
          <Text tone="muted" className="text-center">
            {description}
          </Text>
        ) : null}
      </View>
      {children}
      <View className="gap-2">
        <Button label={primary.label} fullWidth onPress={primary.onPress} />
        {secondary.map((a) => (
          <Button key={a.label} label={a.label} variant="outline" fullWidth onPress={a.onPress} />
        ))}
      </View>
    </View>
  );
}
