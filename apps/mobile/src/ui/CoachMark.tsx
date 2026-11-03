// CoachMark — hướng dẫn lần đầu nhiều bước trong BottomSheet (CLAUDE.md mục 10: tìm, đăng, nhắn; bỏ qua được):
// ô icon tròn → tiêu đề → giải thích → "1/3" + chấm bước (chữ, không chỉ màu) → "Bỏ qua" + "Tiếp" / "Đã hiểu".
// Không trỏ vào phần tử thật (không đo vị trí) — chữ nêu rõ chỗ bấm. Đổi bước: nội dung mờ dần vào (motion.fast;
// Reduce Motion: fade 150ms). `onDone` gọi khi bỏ qua, xong hoặc vuốt đóng — nơi dùng tự lưu "đã xem".
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { FadeIn } from 'react-native-reanimated';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Icon } from './Icon';
import { AnimatedView } from './interop';
import { Text } from './Text';
import { useReducedMotion, useTheme } from './theme';

export type CoachMarkStep = { icon: LucideIcon; title: string; body: string };

export type CoachMarkProps = {
  open: boolean;
  steps: readonly CoachMarkStep[];
  onDone: () => void;
};

export function CoachMark({ open, steps, onDone }: CoachMarkProps) {
  const { t } = useTranslation();
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  if (!step) return null;

  const finish = () => {
    setIndex(0);
    onDone();
  };

  return (
    <BottomSheet open={open} onClose={finish} title={t('coach.label')}>
      <AnimatedView
        key={index}
        entering={FadeIn.duration(reduced ? motion.reduced.duration : motion.fast.duration)}
        className="items-center gap-3"
        accessibilityLiveRegion="polite"
      >
        <View className="size-16 items-center justify-center rounded-full bg-primary-light">
          <Icon icon={step.icon} tone="primary" size="tab" />
        </View>
        <Text variant="title" className="text-center">
          {step.title}
        </Text>
        <Text tone="muted" className="text-center">
          {step.body}
        </Text>
      </AnimatedView>
      <View className="flex-row items-center justify-center gap-2" accessibilityRole="text">
        {steps.map((s, i) => (
          <View key={s.title} className={['h-2 rounded-full', i === index ? 'w-6 bg-primary' : 'w-2 bg-border'].join(' ')} />
        ))}
        <Text variant="caption" tone="muted" className="pl-1">
          {t('coach.step', { current: index + 1, total: steps.length })}
        </Text>
      </View>
      <View className="flex-row gap-2">
        {!last ? (
          <View className="flex-1">
            <Button label={t('coach.skip')} variant="ghost" fullWidth onPress={finish} />
          </View>
        ) : null}
        <View className="flex-1">
          <Button label={t(last ? 'coach.done' : 'coach.next')} fullWidth onPress={last ? finish : () => setIndex(index + 1)} />
        </View>
      </View>
    </BottomSheet>
  );
}
