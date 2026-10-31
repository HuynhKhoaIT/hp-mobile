// BookmarkButton — trái tim lưu tin. Khi chuyển sang "đã lưu" (kể cả do cập nhật lạc quan của useToggleBookmark)
// tim nảy 1 → 1.3 → 1 (t.motion.instant / fast); Reduce Motion → không đổi kích thước. Trạng thái đọc được bằng
// accessibilityState.selected + nhãn đổi theo (không chỉ bằng màu). Haptic do hook của feature gọi (onMutate).
import { Heart } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable } from 'react-native';
import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { AnimatedView } from './interop';
import { useReducedMotion, useTheme } from './theme';

export type BookmarkButtonProps = {
  saved: boolean;
  onToggle: (next: boolean) => void;
  /** Nhãn đọc màn hình (qua t()): lưu / bỏ lưu. */
  labels: { save: string; unsave: string };
  variant?: 'ghost' | 'filled';
  size?: 'button' | 'tab';
  disabled?: boolean;
};

export function BookmarkButton({ saved, onToggle, labels, variant = 'ghost', size = 'tab', disabled = false }: BookmarkButtonProps) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const prev = useRef(saved);

  useEffect(() => {
    if (saved && !prev.current && !reduced) {
      scale.set(
        withSequence(
          withTiming(1.3, { duration: t.motion.instant.duration }),
          withTiming(1, { duration: t.motion.fast.duration }),
        ),
      );
    }
    prev.current = saved;
  }, [saved, reduced, scale, t.motion.instant.duration, t.motion.fast.duration]);

  const color = saved ? t.colors.danger : t.colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? labels.unsave : labels.save}
      accessibilityState={{ selected: saved, disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={() => onToggle(!saved)}
      className={[
        'h-11 w-11 items-center justify-center rounded-full active:opacity-80',
        variant === 'filled' ? 'bg-surface-2' : 'bg-transparent',
        disabled && 'opacity-50',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <AnimatedView style={style}>
        <Heart
          size={t.icon[size]}
          strokeWidth={t.icon.strokeWidth}
          color={color}
          fill={saved ? t.colors.danger : 'transparent'}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </AnimatedView>
    </Pressable>
  );
}
