// Notice — hộp nhắc nhở trong nội dung (vd mẹo giao dịch an toàn): icon + chữ trên nền tông nhạt. Có chữ, không chỉ màu.
import { CircleAlert, Info, type LucideIcon, ShieldAlert } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';

export type NoticeTone = 'info' | 'warning' | 'danger';

const BOX: Record<NoticeTone, string> = { info: 'bg-primary-light', warning: 'bg-warning/15', danger: 'bg-danger/15' };
const ICON: Record<NoticeTone, LucideIcon> = { info: Info, warning: ShieldAlert, danger: CircleAlert };
const ICON_TONE = { info: 'primary', warning: 'warning', danger: 'danger' } as const;

/** `title` (tuỳ chọn) in đậm phía trên `text`; `children` thêm nội dung (vd nút) dưới chữ. */
export function Notice({
  text,
  title,
  tone = 'info',
  icon,
  children,
}: {
  text: string;
  title?: string;
  tone?: NoticeTone;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <View accessibilityRole={children ? undefined : 'text'} className={`flex-row items-start gap-3 rounded-md p-3 ${BOX[tone]}`}>
      <Icon icon={icon ?? ICON[tone]} tone={ICON_TONE[tone]} />
      <View className="flex-1 gap-1">
        {title ? <Text variant="label">{title}</Text> : null}
        <Text>{text}</Text>
        {children}
      </View>
    </View>
  );
}
