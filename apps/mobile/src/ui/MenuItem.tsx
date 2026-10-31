// MenuItem — một dòng điều hướng trong danh sách (màn Tôi, Cài đặt): icon + nhãn + giá trị phụ + mũi tên.
// Cao ≥ 48, cả dòng là vùng chạm; đặt trong <Card padded={false}> và ngăn bằng <Divider />.
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Icon } from './Icon';
import { Text, type TextTone } from './Text';

export type MenuItemProps = {
  label: string;
  icon?: LucideIcon;
  /** Chữ phụ bên phải (vd ngôn ngữ đang chọn, số tin). */
  value?: string;
  tone?: Extract<TextTone, 'default' | 'danger' | 'primary'>;
  onPress: () => void;
  /** Ẩn mũi tên (hành động tại chỗ như Đăng xuất). */
  chevron?: boolean;
};

export function MenuItem({ label, icon, value, tone = 'default', onPress, chevron = true }: MenuItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      className="min-h-12 flex-row items-center gap-3 px-4 py-3 active:bg-surface-2"
    >
      {icon ? <Icon icon={icon} tone={tone === 'default' ? 'muted' : tone} /> : null}
      <Text variant="label" tone={tone} className="flex-1">
        {label}
      </Text>
      {value ? <Text tone="muted">{value}</Text> : null}
      {chevron ? (
        <View>
          <Icon icon={ChevronRight} tone="muted" />
        </View>
      ) : null}
    </Pressable>
  );
}
