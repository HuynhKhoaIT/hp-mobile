// Badge — nhãn luôn có chữ (không truyền tải chỉ bằng màu). Tone khớp Badge của app (apps/mobile/src/ui/Badge.tsx):
// viên thuốc px-3 py-1, chữ xs đậm vừa. Đổi tone / kích thước → đổi cả hai bên.
// `overlay` (như app): nhãn đặt trên ảnh — nền surface/90 bo sm, chữ xs đậm 600, màu chữ theo tone (success / warning
// giữ chữ fg vì chữ màu đó trên nền trắng không đủ 4,5:1).
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-fg',
  primary: 'bg-primary-light text-primary',
  success: 'bg-success/15 text-fg',
  warning: 'bg-warning/15 text-fg',
  danger: 'bg-danger/15 text-danger',
};

const OVERLAY_TEXT: Record<BadgeTone, string> = {
  neutral: 'text-fg',
  primary: 'text-primary',
  success: 'text-fg',
  warning: 'text-fg',
  danger: 'text-danger',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
  lang,
  overlay = false,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  lang?: string;
  overlay?: boolean;
}) {
  return (
    <span
      lang={lang}
      className={cn(
        'inline-flex max-w-full items-center text-xs',
        overlay
          ? cn('rounded-sm bg-surface/90 px-2 py-0.5 font-semibold shadow-card backdrop-blur-sm', OVERLAY_TEXT[tone])
          : cn('rounded-full px-3 py-1 font-medium', TONE[tone]),
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
