// MenuItem — một dòng điều hướng trong danh sách (màn Tôi, Cài đặt): icon + nhãn + giá trị phụ + mũi tên.
// Cao ≥ 48, cả dòng là vùng chạm; đặt trong <Card padded={false}> và ngăn bằng <Divider />.
// `iconBox` (style Stitch, khối "Cài đặt & hỗ trợ" tab Tôi): icon trong ô size-8 rounded-md — nền surface-2 icon primary;
// tone danger → nền danger/10 icon danger, nhãn đậm 600. `description`: dòng phụ text-sm muted dưới nhãn.
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Icon } from './Icon';
import { Text, type TextTone } from './Text';

export type MenuItemProps = {
  label: string;
  icon?: LucideIcon;
  /** Chữ phụ bên phải (vd ngôn ngữ đang chọn, số tin). */
  value?: string;
  /** Dòng phụ dưới nhãn. */
  description?: string;
  tone?: Extract<TextTone, 'default' | 'danger' | 'primary'>;
  /** Icon trong ô nền nhạt bo md (thay cho icon trần màu muted). */
  iconBox?: boolean;
  onPress: () => void;
  /** Ẩn mũi tên (hành động tại chỗ như Đăng xuất). */
  chevron?: boolean;
};

export function MenuItem({ label, icon, value, description, tone = 'default', iconBox = false, onPress, chevron = true }: MenuItemProps) {
  const danger = tone === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, description, value].filter(Boolean).join(', ')}
      onPress={onPress}
      className="min-h-12 flex-row items-center gap-3 px-4 py-3 active:bg-surface-2"
    >
      {icon && iconBox ? (
        <View className={`size-8 items-center justify-center rounded-md ${danger ? 'bg-danger/10' : 'bg-surface-2'}`}>
          <Icon icon={icon} tone={danger ? 'danger' : 'primary'} />
        </View>
      ) : icon ? (
        <Icon icon={icon} tone={tone === 'default' ? 'muted' : tone} />
      ) : null}
      <View className="flex-1">
        <Text variant="label" tone={tone} weight={iconBox && danger ? 'semibold' : undefined}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      {value ? <Text tone="muted">{value}</Text> : null}
      {chevron ? (
        <View>
          <Icon icon={ChevronRight} tone={danger && iconBox ? 'danger' : 'muted'} />
        </View>
      ) : null}
    </Pressable>
  );
}
