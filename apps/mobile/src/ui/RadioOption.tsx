// RadioOption — một lựa chọn dạng nút radio cao 48 (vd "Sắp xếp" ở màn Bộ lọc mini-app, style Stitch): khung bo md viền
// border, chọn → viền primary + nền primary-light + chữ primary đậm + vòng tròn có chấm. accessibilityRole radio +
// accessibilityState.checked (không chỉ bằng màu). Đặt trong View accessibilityRole="radiogroup".
import { Pressable, View } from 'react-native';
import { Text } from './Text';

export type RadioOptionProps = { label: string; selected: boolean; onPress: () => void; disabled?: boolean };

export function RadioOption({ label, selected, onPress, disabled = false }: RadioOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={[
        'min-h-12 flex-row items-center gap-3 rounded-md border px-3 active:opacity-80',
        selected ? 'border-primary bg-primary-light' : 'border-border bg-surface',
        disabled && 'opacity-50',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Text tone={selected ? 'primary' : 'default'} weight={selected ? 'semibold' : 'regular'} className="flex-1">
        {label}
      </Text>
      <View className={`size-5 items-center justify-center rounded-full border-2 ${selected ? 'border-primary' : 'border-border'}`}>
        {selected ? <View className="size-2.5 rounded-full bg-primary" /> : null}
      </View>
    </Pressable>
  );
}
