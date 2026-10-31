'use client';

// ChoiceChip — lựa chọn dạng viên thuốc (ngôn ngữ, khu, quan tâm, filter). Khớp Chip của app:
// chọn = viền primary + nền primary-light; trạng thái báo bằng aria-pressed, không chỉ bằng màu.
import type * as React from 'react';
import { cn } from '@/lib/utils';

export function ChoiceChip({
  selected,
  className,
  ...props
}: React.ComponentProps<'button'> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-md font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
        selected ? 'border-primary bg-primary-light text-primary' : 'border-border bg-surface text-fg hover:bg-surface-2',
        className,
      )}
      {...props}
    />
  );
}
