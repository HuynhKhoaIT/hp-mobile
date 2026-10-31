// Skeleton (shadcn) chỉnh theo token: nền surface-2, nhấp nháy tắt khi người dùng bật giảm chuyển động.
import type * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn('animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none', className)}
      {...props}
    />
  );
}

export { Skeleton };
