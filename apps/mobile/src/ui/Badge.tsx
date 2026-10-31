// Badge — nhãn trạng thái luôn có chữ (không truyền tải chỉ bằng màu). Tone khớp StatusBadge / badge của web.
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
  success: 'success',
  warning: 'default',
  danger: 'danger',
};

/** numberOfLines chỉ dùng trong card (ô hẹp); nơi khác để chữ xuống dòng. */
export function Badge({ label, tone = 'neutral', numberOfLines }: { label: string; tone?: BadgeTone; numberOfLines?: number }) {
  return (
    <View className={`self-start rounded-full px-3 py-1 ${BOX[tone]}`}>
      <Text variant="caption" tone={TONE[tone]} className="font-sans-medium" numberOfLines={numberOfLines}>
        {label}
      </Text>
    </View>
  );
}
