// Skeleton (shadcn) chỉnh theo token: nền surface-2 + dải sáng chéo (::after, rộng 2/5 khối, gradient trong suốt →
// shimmer → trong suốt) quét trái → phải 1.2s/lượt (animate-skeleton-shimmer, sinh từ motion.shimmer của @hp/tokens) —
// cùng cảm giác với app (Skeleton.tsx). Giảm chuyển động hoặc khu admin (chỉ transition 150ms) → khối đứng yên, không dải.
import type * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        'pointer-events-none relative overflow-hidden rounded-md bg-surface-2',
        'after:absolute after:inset-y-0 after:left-0 after:w-2/5 after:bg-linear-to-r after:from-transparent after:via-shimmer after:to-transparent',
        'after:animate-skeleton-shimmer motion-reduce:after:hidden admin:after:hidden',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
