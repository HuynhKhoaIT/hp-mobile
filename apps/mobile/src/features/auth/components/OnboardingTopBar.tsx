// Thanh trên của onboarding (style Stitch "Chọn nơi làm việc"): nút quay lại (bước > 1) · viên "Bước x/y" giữa · nút
// phụ bên phải (Bỏ qua ở bước cuối) → thanh tiến độ chia đoạn (đoạn đã qua primary, đoạn hiện tại accent, còn lại border;
// trang trí — số bước đọc từ viên giữa).
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, IconButton, Row, Text } from '@/ui';

const SEGMENT = { done: 'bg-primary', current: 'bg-accent', next: 'bg-border' } as const;

export function OnboardingTopBar({
  step,
  total,
  onBack,
  action,
}: {
  step: number;
  total: number;
  onBack?: () => void;
  action?: { label: string; onPress: () => void; disabled?: boolean };
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-2 pb-2">
      <Row justify="between" className="min-h-14">
        <View className="min-w-24 items-start">
          {onBack ? <IconButton icon={ChevronLeft} accessibilityLabel={t('actions.back')} onPress={onBack} /> : null}
        </View>
        <Row gap={2} className="rounded-full border border-border bg-surface px-3 py-1">
          <View className="size-2 rounded-full bg-accent" />
          <Text variant="caption" weight="bold" tone="primary">
            {t('auth:onboarding.step', { current: step, total })}
          </Text>
        </Row>
        <View className="min-w-24 items-end">
          {action ? <Button size="sm" variant="ghost" label={action.label} disabled={action.disabled} onPress={action.onPress} /> : null}
        </View>
      </Row>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="flex-row gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            className={`h-1 flex-1 rounded-full ${i + 1 < step ? SEGMENT.done : i + 1 === step ? SEGMENT.current : SEGMENT.next}`}
          />
        ))}
      </View>
    </View>
  );
}
