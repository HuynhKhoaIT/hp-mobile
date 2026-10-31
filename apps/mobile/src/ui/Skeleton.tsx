// Skeleton — khối chờ đúng hình nội dung; nhấp nháy 1.2s/lượt (t.motion.skeletonShimmerMs), tắt khi Reduce Motion.
// SkeletonListingCard theo bố cục thẻ tin (ảnh 4:3 → tiêu đề 2 dòng → giá → khu vực) — khớp web ListingCardSkeleton.
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
      className={['rounded-md bg-surface-2', className].filter(Boolean).join(' ')}
    />
  );
}

export function SkeletonListingCard({ count = 1 }: { count?: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className="gap-2 rounded-md bg-surface p-2 shadow-card">
          <Skeleton className="aspect-card w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </View>
      ))}
    </View>
  );
}
