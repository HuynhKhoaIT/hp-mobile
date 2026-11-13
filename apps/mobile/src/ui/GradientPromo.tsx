// GradientPromo — khối mời hành động trên nền gradient của mini-app (style Stitch "Dành cho chủ nhà trọ": nền gradient chéo
// bo lg + vòng tròn trang trí on-primary/10 góc phải dưới; dòng nhỏ in hoa kèm icon → tiêu đề đậm → mô tả → nút cam
// (accent) tự co theo chữ). Chữ / icon trắng cả giao diện tối (GradientSurface). Chữ không cắt; nút xuống dòng khi phóng chữ.
import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { Button } from './Button';
import { GradientSurface } from './GradientSurface';
import { Icon } from './Icon';
import { Text } from './Text';

export type GradientPromoProps = {
  /** Dòng nhỏ in hoa trên tiêu đề (vd "Dành cho chủ nhà trọ"). */
  eyebrow?: string;
  /** Icon trước dòng nhỏ. */
  icon?: LucideIcon;
  title: string;
  body?: string;
  action: { label: string; onPress: () => void; icon?: LucideIcon };
  className?: string;
};

export function GradientPromo({ eyebrow, icon, title, body, action, className }: GradientPromoProps) {
  return (
    <GradientSurface direction="diagonal" className={['overflow-hidden rounded-lg p-4 shadow-card', className].filter(Boolean).join(' ')}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        className="absolute -bottom-6 -right-6 size-28 rounded-full bg-on-primary/10"
      />
      <View className="gap-1.5">
        {eyebrow ? (
          <View className="flex-row items-center gap-1.5">
            {icon ? <Icon icon={icon} tone="onPrimary" size={18} /> : null}
            <Text variant="caption" weight="bold" tone="onPrimary" className="flex-1 uppercase">
              {eyebrow}
            </Text>
          </View>
        ) : null}
        <Text variant="title" weight="bold" tone="onPrimary" accessibilityRole="header">
          {title}
        </Text>
        {body ? (
          <Text variant="caption" tone="onPrimary" className="opacity-90">
            {body}
          </Text>
        ) : null}
        <View className="mt-2 self-start">
          <Button variant="accent" label={action.label} icon={action.icon} onPress={action.onPress} />
        </View>
      </View>
    </GradientSurface>
  );
}
