// SuccessScreen — màn kết quả sau một thao tác lớn (đăng tin): biểu tượng trong vòng tròn tông màu, tiêu đề, mô tả,
// nội dung thêm (vd lý do chờ duyệt), một nút chính + các nút phụ. Biểu tượng hiện bằng phóng to + mờ dần
// (Reduce Motion → chỉ mờ dần 150ms). `celebrate`: thay biểu tượng bằng dấu tích Lottie (tải lười, không chặn nút);
// Reduce Motion → vẫn biểu tượng tĩnh.
import { CheckCircle2, CircleAlert, Clock, type LucideIcon } from 'lucide-react-native';
import { lazy, type ReactNode, Suspense } from 'react';
import { View } from 'react-native';
import { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Button } from './Button';
import { Icon } from './Icon';
import { AnimatedView } from './interop';
import { Text } from './Text';
import { useReducedMotion, useTheme } from './theme';

const SuccessCheckAnimation = lazy(() => import('./SuccessCheckAnimation'));

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
