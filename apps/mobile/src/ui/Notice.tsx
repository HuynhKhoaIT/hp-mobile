// Notice — hộp nhắc nhở trong nội dung (vd mẹo giao dịch an toàn): icon + chữ trên nền tông nhạt. Có chữ, không chỉ màu.
import { Info, type LucideIcon, ShieldAlert } from 'lucide-react-native';
import { View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';

export type NoticeTone = 'info' | 'warning';

const BOX: Record<NoticeTone, string> = { info: 'bg-primary-light', warning: 'bg-warning/15' };
const ICON: Record<NoticeTone, LucideIcon> = { info: Info, warning: ShieldAlert };

export function Notice({ text, tone = 'info', icon }: { text: string; tone?: NoticeTone; icon?: LucideIcon }) {
  return (
    <View accessibilityRole="text" className={`flex-row items-start gap-3 rounded-md p-3 ${BOX[tone]}`}>
      <Icon icon={icon ?? ICON[tone]} tone={tone === 'warning' ? 'warning' : 'primary'} />
      <Text className="flex-1">{text}</Text>
    </View>
  );
}
