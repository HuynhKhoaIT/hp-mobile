// Badge — nhãn trạng thái luôn có chữ (không truyền tải chỉ bằng màu). Tone khớp StatusBadge / badge của web.
// `overlay`: nhãn đặt trên ảnh (góc trái trên ảnh ListingCard, style Stitch) — nền surface/90 bo sm, chữ text-xs đậm 600;
// màu chữ theo tone như thường (success / warning giữ chữ fg vì chữ màu đó trên nền trắng không đủ 4,5:1).
import { View } from 'react-native';
import { Text, type TextTone } from './Text';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const BOX: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2',
  primary: 'bg-primary-light',
  success: 'bg-success/15',
  warning: 'bg-warning/15',
  danger: 'bg-danger/15',
};
const TONE: Record<BadgeTone, TextTone> = {
  neutral: 'default',
  primary: 'primary',
  success: 'default',
  warning: 'default',
  danger: 'danger',
};

/** numberOfLines chỉ dùng trong card (ô hẹp); nơi khác để chữ xuống dòng. */
export function Badge({
  label,
  tone = 'neutral',
  numberOfLines,
  overlay = false,
}: {
  label: string;
  tone?: BadgeTone;
  numberOfLines?: number;
  overlay?: boolean;
}) {
  if (overlay) {
    return (
      <View className="max-w-full self-start rounded-sm bg-surface/90 px-2 py-0.5">
        <Text variant="micro" weight="semibold" tone={TONE[tone]} numberOfLines={numberOfLines}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View className={`max-w-full self-start rounded-full px-3 py-1 ${BOX[tone]}`}>
      <Text variant="caption" tone={TONE[tone]} className="font-sans-medium" numberOfLines={numberOfLines}>
        {label}
      </Text>
    </View>
  );
}
