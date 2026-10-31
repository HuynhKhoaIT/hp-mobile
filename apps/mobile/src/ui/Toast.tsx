// Toast — thông báo ngắn ở đáy màn, tự ẩn sau 3 giây. Gọi `toast.show(message, tone)` ở bất kỳ đâu;
// <ToastHost /> đặt một lần ở providers. Hiện bằng fade + trượt lên (Reduce Motion: chỉ fade). Không chặn thao tác.
import { CheckCircle2, CircleAlert, Info } from 'lucide-react-native';
import { View } from 'react-native';
import { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { Icon } from './Icon';
import { AnimatedView } from './interop';
import { Text } from './Text';
import { useReducedMotion, useTheme } from './theme';

export type ToastTone = 'info' | 'success' | 'danger';
type ToastItem = { id: number; message: string; tone: ToastTone };

const DURATION_MS = 3000;
let nextId = 1;

const useToastStore = create<{ items: ToastItem[]; push: (item: ToastItem) => void; remove: (id: number) => void }>((set) => ({
  items: [],
  push: (item) => set((s) => ({ items: [...s.items.slice(-2), item] })),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export const toast = {
  show(message: string, tone: ToastTone = 'info') {
    const id = nextId++;
    useToastStore.getState().push({ id, message, tone });
    setTimeout(() => useToastStore.getState().remove(id), DURATION_MS);
  },
};

const ICON = { info: Info, success: CheckCircle2, danger: CircleAlert } as const;
const TONE = { info: 'primary', success: 'success', danger: 'danger' } as const;

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { motion, space } = useTheme();
  const entering = (reduced ? FadeIn.duration(motion.reduced.duration) : FadeInDown.duration(motion.fast.duration));

  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 bottom-0 gap-2 px-4" style={{ paddingBottom: insets.bottom + space[4] }}>
      {items.map((item) => (
        <AnimatedView
          key={item.id}
          entering={entering}
          exiting={FadeOut.duration(motion.fast.duration)}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          className="flex-row items-center gap-3 rounded-md bg-surface p-4 shadow-card"
        >
          <Icon icon={ICON[item.tone]} tone={TONE[item.tone]} />
          <Text className="flex-1">{item.message}</Text>
        </AnimatedView>
      ))}
    </View>
  );
}
