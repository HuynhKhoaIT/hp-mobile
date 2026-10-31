// Notice — hộp nhắc nhở trong nội dung (vd mẹo giao dịch an toàn): icon + chữ trên nền tông nhạt. Có chữ, không chỉ màu.
// variant 'bordered' (hộp an toàn ở Hub, docs/design/home.md §10): rounded-lg, viền tone/40, nền tone/10, p-4, icon 24.
import { CircleAlert, Info, type LucideIcon, ShieldAlert } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';

export type NoticeTone = 'info' | 'warning' | 'danger';

const BOX: Record<NoticeTone, string> = { info: 'bg-primary-light', warning: 'bg-warning/15', danger: 'bg-danger/15' };
const BOX_BORDERED: Record<NoticeTone, string> = {
  info: 'border-primary/40 bg-primary-light',
  warning: 'border-warning/40 bg-warning/10',
  danger: 'border-danger/40 bg-danger/10',
};
const ICON: Record<NoticeTone, LucideIcon> = { info: Info, warning: ShieldAlert, danger: CircleAlert };
const ICON_TONE = { info: 'primary', warning: 'warning', danger: 'danger' } as const;

/** `title` (tuỳ chọn) in đậm phía trên `text`; `children` thêm nội dung (vd nút) dưới chữ. */
export function Notice({
  text,
  title,
  tone = 'info',
  icon,
  variant = 'soft',
  children,
}: {
  text: string;
  title?: string;
  tone?: NoticeTone;
  icon?: LucideIcon;
  variant?: 'soft' | 'bordered';
  children?: ReactNode;
}) {
  const bordered = variant === 'bordered';
  const box = bordered ? `rounded-lg border p-4 ${BOX_BORDERED[tone]}` : `rounded-md p-3 ${BOX[tone]}`;
  return (
    <View accessibilityRole={children ? undefined : 'text'} className={`flex-row items-start gap-3 ${box}`}>
      <Icon icon={icon ?? ICON[tone]} tone={ICON_TONE[tone]} size={bordered ? 'tab' : 'button'} />
      <View className="flex-1 gap-1">
        {title ? (
          <Text variant="label" weight={bordered ? 'semibold' : undefined}>
            {title}
          </Text>
        ) : null}
        <Text>{text}</Text>
        {children}
      </View>
    </View>
  );
}
