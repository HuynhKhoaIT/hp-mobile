// Skeleton — khối chờ đúng hình nội dung; nhấp nháy 1.2s/lượt (t.motion.skeletonShimmerMs), tắt khi Reduce Motion.
// SkeletonListingCard theo bố cục ListingCard (ảnh → badge → tiêu đề 2 dòng → giá → khu vực) — khớp web ListingCardSkeleton.
// SkeletonListingDetail theo bố cục màn chi tiết tin.
import { useEffect } from 'react';
import { View } from 'react-native';
import { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { AnimatedView } from './interop';
import { useReducedMotion, useTheme } from './theme';

export function Skeleton({ className }: { className?: string }) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    opacity.set(withRepeat(withTiming(0.5, { duration: motion.skeletonShimmerMs / 2 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [reduced, motion.skeletonShimmerMs, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <AnimatedView
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
      // Bo góc mặc định md; className có rounded-* riêng thì dùng của nó (tránh hai class cùng thuộc tính).
      className={['bg-surface-2', /rounded/.test(className ?? '') ? null : 'rounded-md', className].filter(Boolean).join(' ')}
    />
  );
}

function CardBones() {
  return (
    <View className="gap-2">
      <Skeleton className="h-6 w-1/2 rounded-full" />
      <Skeleton className="h-5 w-11/12" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
    </View>
  );
}

/** Một thẻ chờ đúng hình ListingCard (grid: ảnh 4:3 trên; row: ảnh vuông trái). */
function OneCard({ layout, className }: { layout: 'grid' | 'row'; className?: string }) {
  if (layout === 'row') {
    return (
      <View className={['flex-row items-start gap-3 rounded-md bg-surface p-3 shadow-card', className].filter(Boolean).join(' ')}>
        <Skeleton className="aspect-avatar w-24 rounded-sm" />
        <View className="flex-1">
          <CardBones />
        </View>
      </View>
    );
  }
  return (
    <View className={['rounded-md bg-surface shadow-card', className].filter(Boolean).join(' ')}>
      <Skeleton className="aspect-card w-full rounded-t-md" />
      <View className="p-3">
        <CardBones />
      </View>
    </View>
  );
}

export type SkeletonListingCardProps = {
  count?: number;
  layout?: 'grid' | 'row';
  /** grid: 2 = hai cột như danh sách; 1 = một thẻ mỗi hàng. */
  columns?: 1 | 2;
  /** Hàng ngang (section ở Hub / tin tương tự): thẻ rộng cố định nằm cạnh nhau. */
  horizontal?: boolean;
};

export function SkeletonListingCard({ count = 1, layout = 'grid', columns = 1, horizontal = false }: SkeletonListingCardProps) {
  const items = Array.from({ length: count }, (_, i) => i);
  if (horizontal) {
    return (
      <View className="flex-row gap-3 overflow-hidden">
        {items.map((i) => (
          <OneCard key={i} layout="grid" className="w-44" />
        ))}
      </View>
    );
  }
  if (layout === 'grid' && columns === 2) {
    const rows = Array.from({ length: Math.ceil(count / 2) }, (_, r) => r);
    return (
      <View className="gap-3">
        {rows.map((r) => (
          <View key={r} className="flex-row gap-3">
            <OneCard layout="grid" className="flex-1" />
            <OneCard layout="grid" className="flex-1" />
          </View>
        ))}
      </View>
    );
  }
  return (
    <View className="gap-3">
      {items.map((i) => (
        <OneCard key={i} layout={layout} />
      ))}
    </View>
  );
}

/** Màn chi tiết tin đang tải: ảnh 4:3 → tiêu đề → giá → badge → khối thông tin → người đăng. */
export function SkeletonListingDetail() {
  return (
    <View className="gap-4">
      <Skeleton className="aspect-card w-full" />
      <View className="gap-2">
        <Skeleton className="h-7 w-11/12" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-6 w-1/4 rounded-full" />
      </View>
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-32 w-full" />
      <View className="flex-row items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </View>
      </View>
    </View>
  );
}
