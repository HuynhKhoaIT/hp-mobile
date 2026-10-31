// Badge — nhãn luôn có chữ (không truyền tải chỉ bằng màu). Tone khớp Badge của app (apps/mobile/src/ui/Badge.tsx):
// viên thuốc px-3 py-1, chữ xs đậm vừa. Đổi tone / kích thước → đổi cả hai bên.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-fg',
  primary: 'bg-primary-light text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-fg',
  danger: 'bg-danger/15 text-danger',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
  lang,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  lang?: string;
}) {
  return (
    <span
      lang={lang}
      className={cn('inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-medium', TONE[tone], className)}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
