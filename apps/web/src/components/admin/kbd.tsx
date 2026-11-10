// Kbd — phím tắt hiển thị cạnh nút / trong bảng phím tắt. Chỉ là chữ trang trí cho người dùng bàn phím (aria-hidden ở nút).
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-6 items-center justify-center rounded-sm border border-border bg-surface-2 px-1.5 font-sans text-xs font-semibold text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
