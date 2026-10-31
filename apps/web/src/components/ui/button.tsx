// Button (shadcn, nền Radix) đã chỉnh theo token @hp/tokens và chuẩn dễ dùng của dự án:
// cao tối thiểu 44px (lg 48px cho nút chính), chữ 16px, bo `rounded-md`, không class giá trị tuỳ ý.
// Biến thể `accent` = nút Đăng tin (cam), giống app.
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-97 motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-on-primary hover:bg-primary/90',
        accent: 'bg-accent text-on-accent hover:bg-accent/90',
        outline: 'border-border bg-surface text-fg hover:bg-surface-2 aria-expanded:bg-surface-2',
        secondary: 'bg-surface-2 text-fg hover:bg-border',
        ghost: 'text-fg hover:bg-surface-2 aria-expanded:bg-surface-2',
        destructive: 'bg-danger/10 text-danger hover:bg-danger/20 focus-visible:ring-danger/30',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-11 px-4 text-md [&_svg]:size-5',
        sm: 'min-h-11 px-3 text-sm [&_svg]:size-4',
        lg: 'min-h-12 px-6 text-md [&_svg]:size-5',
        icon: 'size-11 [&_svg]:size-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
