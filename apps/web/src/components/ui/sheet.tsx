'use client';

// Sheet (shadcn, Radix Dialog) chỉnh theo token: tấm trượt từ cạnh màn hình (menu admin trên điện thoại / tablet).
// Transition 150ms, tắt trượt khi người dùng bật giảm chuyển động. Nút đóng cần nhãn dịch (closeLabel), không chữ cứng.
import { XIcon } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({
  className,
  children,
  side = 'left',
  closeLabel,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'left' | 'right';
  /** Nhãn nút đóng (trình đọc màn hình). Bỏ trống = không hiện nút đóng. */
  closeLabel?: string;
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-fg/40 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 dark:bg-bg/80"
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'fixed inset-y-0 z-50 flex w-72 flex-col bg-surface text-fg shadow-card outline-none duration-150',
          'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
          side === 'left'
            ? 'left-0 border-r border-border data-open:slide-in-from-left-4 motion-reduce:data-open:slide-in-from-left-0'
            : 'right-0 border-l border-border data-open:slide-in-from-right-4 motion-reduce:data-open:slide-in-from-right-0',
          className,
        )}
        {...props}
      >
        {children}
        {closeLabel ? (
          <SheetPrimitive.Close asChild>
            <Button variant="ghost" size="icon" className="absolute top-2.5 right-2" aria-label={closeLabel}>
              <XIcon strokeWidth={1.75} />
            </Button>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn('text-lg font-semibold', className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn('text-md text-muted', className)} {...props} />;
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger };
