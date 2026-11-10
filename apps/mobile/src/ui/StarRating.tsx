// StarRating — 5 sao. Có `onChange` → chọn điểm (đánh giá chủ nhóm, sau giao dịch): mỗi sao là một nút radio vùng
// chạm ≥ 44, sao đã chọn tô kín màu warning; không haptic, không animation (thao tác nhập liệu). Không có `onChange`
// → chỉ hiển thị (vd "Bạn đã chấm 4/5"), đọc thành một nhãn. Điểm luôn kèm chữ ở nơi gọi (không chỉ dựa vào màu sao).
import { Star } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from './theme';

export type StarRatingProps = {
  /** 0 = chưa chọn; 1..max. */
  value: number;
  onChange?: (score: number) => void;
  max?: number;
  /** 'lg' (32, sheet đánh giá) · 'sm' (16, dòng tóm tắt). */
  size?: 'sm' | 'lg';
  /** Nhãn cả nhóm sao (vd "Đánh giá chủ nhóm" hoặc "4/5 sao"). */
  accessibilityLabel: string;
  /** Nhãn từng sao khi chọn được (vd "3 sao"). */
  starLabel?: (score: number) => string;
  disabled?: boolean;
  className?: string;
};

export function StarRating({
  value,
  onChange,
  max = 5,
  size = 'lg',
  accessibilityLabel,
  starLabel,
  disabled = false,
  className,
}: StarRatingProps) {
  const theme = useTheme();
  const px = size === 'lg' ? theme.space[8] : theme.space[4];
  const scores = Array.from({ length: max }, (_, i) => i + 1);

  if (!onChange) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} className={['flex-row gap-0.5', className].filter(Boolean).join(' ')}>
        {scores.map((n) => (
          <Icon key={n} icon={Star} size={px} tone={n <= value ? 'warning' : 'disabled'} filled={n <= value} />
        ))}
      </View>
    );
  }

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} className={['flex-row gap-1', className].filter(Boolean).join(' ')}>
      {scores.map((n) => (
        <Pressable
          key={n}
          accessibilityRole="radio"
          accessibilityLabel={starLabel ? starLabel(n) : String(n)}
          accessibilityState={{ checked: value === n, disabled }}
          disabled={disabled}
          hitSlop={4}
          onPress={() => onChange(n)}
          className="min-h-11 min-w-11 items-center justify-center rounded-full active:bg-surface-2"
        >
          <Icon icon={Star} size={px} tone={n <= value ? 'warning' : 'muted'} filled={n <= value} />
        </Pressable>
      ))}
    </View>
  );
}
