// Textarea (shadcn) chỉnh theo token giống Input: chữ 16px, viền border, focus primary, lỗi danger qua aria-invalid.
import type * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-32 w-full min-w-0 rounded-sm border border-border bg-surface px-3 py-3 text-md text-fg transition-colors outline-none placeholder:text-disabled',
        'focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-disabled',
        'aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
