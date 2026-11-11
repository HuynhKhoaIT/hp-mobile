// Skeleton — khối chờ đúng hình nội dung; dải sáng chéo (t.motion.shimmer: rộng 40% khối, nghiêng −20°, màu t.shimmer mờ
// dần hai mép) quét trái → phải 1.2s/lượt (t.motion.skeletonShimmerMs) — cùng cảm giác với web (animate-skeleton-shimmer).
// Reduce Motion → khối đứng yên, không dải. Trang trí: trình đọc màn hình bỏ qua, không nhận chạm.
// SkeletonListingCard theo bố cục ListingCard (ảnh → badge → tiêu đề 2 dòng → giá → khu vực) — khớp web ListingCardSkeleton.
// SkeletonListingDetail theo bố cục màn chi tiết tin (ảnh tràn mép).
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { AnimatedView } from './interop';
import { easingOf, useReducedMotion, useTheme } from './theme';

export function Skeleton({ className }: { className?: string }) {
  const { motion, shimmer } = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const { duration, easing, band: bandRatio, skewDeg } = motion.shimmer;
  const band = width * bandRatio;
  // Hai mép dùng cùng màu với alpha 0 (không 'transparent' = đen trong suốt → viền xám khi nội suy trên Android / iOS).
  const clear = shimmer.replace(/[\d.]+\)$/, '0)');

  useEffect(() => {
    if (reduced || width === 0) return;
    progress.set(0);
    progress.set(withRepeat(withTiming(1, { duration, easing: easingOf(easing) }), -1, false));
    return () => cancelAnimation(progress);
  }, [reduced, width, duration, easing, progress]);

  // Bắt đầu ngoài mép trái (−1,5 dải, chừa phần nghiêng), kết thúc ngoài mép phải — khớp keyframes skeleton-shimmer của web.
  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -1.5 * band + progress.get() * (width + 2 * band) }, { skewX: `${skewDeg}deg` }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      onLayout={reduced ? undefined : onLayout}
      // Bo góc mặc định md; className có rounded-* riêng thì dùng của nó (tránh hai class cùng thuộc tính).
      className={['overflow-hidden bg-surface-2', /rounded/.test(className ?? '') ? null : 'rounded-md', className].filter(Boolean).join(' ')}
    >
      {!reduced && width > 0 ? (
        <AnimatedView
          className="absolute inset-y-0 left-0"
          style={[{ width: band, backgroundImage: `linear-gradient(90deg, ${clear}, ${shimmer}, ${clear})` }, bandStyle]}
        />
      ) : null}
    </View>
  );
}

/** `badge`: hàng badge trong thân thẻ (row); grid đặt badge nổi trên ảnh. */
function CardBones({ badge = true }: { badge?: boolean }) {
  return (
    <View className="gap-2">
      {badge ? <Skeleton className="h-6 w-1/2 rounded-full" /> : null}
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
      <View className={['flex-row items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-card', className].filter(Boolean).join(' ')}>
        <Skeleton className="aspect-avatar w-24 rounded-md" />
        <View className="flex-1">
          <CardBones />
        </View>
      </View>
    );
  }
  return (
    <View className={['rounded-lg border border-border bg-surface shadow-card', className].filter(Boolean).join(' ')}>
      <Skeleton className="aspect-card w-full rounded-t-lg" />
      <View className="p-3">
        <CardBones badge={false} />
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
  /** Bề rộng thẻ trong hàng ngang (khớp ListingRail: 'w-44' tin tương tự, 'w-52' dải Hub). */
  itemClassName?: string;
};

export function SkeletonListingCard({
  count = 1,
  layout = 'grid',
  columns = 1,
  horizontal = false,
  itemClassName = 'w-44',
}: SkeletonListingCardProps) {
  const items = Array.from({ length: count }, (_, i) => i);
  if (horizontal) {
    return (
      <View className="flex-row gap-3 overflow-hidden">
        {items.map((i) => (
          <OneCard key={i} layout="grid" className={itemClassName} />
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
      {/* Ảnh tràn mép như ImageGallery bleed (chi tiết tin, style Stitch). */}
      <Skeleton className="-mx-4 aspect-card rounded-none" />
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
