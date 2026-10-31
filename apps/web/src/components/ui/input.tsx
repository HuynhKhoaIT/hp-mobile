// Input (shadcn) chỉnh theo token: cao 48px, chữ 16px (iOS không tự phóng to khi chữ ≥ 16px), bo `rounded-sm`.
import type * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'min-h-12 w-full min-w-0 rounded-sm border border-border bg-surface px-3 text-md text-fg transition-colors outline-none placeholder:text-disabled',
        'focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-disabled',
        'aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
