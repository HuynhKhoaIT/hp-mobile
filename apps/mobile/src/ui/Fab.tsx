// Fab — nút nổi góc dưới phải cho hành động chính của màn danh sách (Đăng tin): nền accent, icon + chữ, bóng card.
// Cao 48 (nút chính), nhấn thu nhỏ 0.97; nằm trên vùng an toàn đáy.
import type { LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { AnimatedView } from './interop';
import { Text } from './Text';
import { useTheme } from './theme';
import { usePressScale } from './usePressScale';

export type FabProps = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
};

export function Fab({ label, icon, onPress }: FabProps) {
  const insets = useSafeAreaInsets();
  const { space } = useTheme();
  const press = usePressScale();
  return (
    <AnimatedView className="absolute" style={[press.style, { right: space[4], bottom: insets.bottom + space[4] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        className="min-h-12 flex-row items-center gap-2 rounded-full bg-accent px-5 shadow-card"
      >
        <Icon icon={icon} tone="onAccent" />
        <Text variant="label" tone="onAccent">
          {label}
        </Text>
      </Pressable>
    </AnimatedView>
  );
}
