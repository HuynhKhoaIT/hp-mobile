// Thẻ một nhóm ô của form "Đăng nhanh" (style Stitch L2, khớp app: Card + SectionHeader size md có ô icon):
// khung bo lg viền hairline + bóng card, tiêu đề text-md đậm vừa với ô icon size-8 rounded-md nền primary-light.
import type { LucideIcon } from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { cn } from '@/lib/utils';

export function FormSection({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn('flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card sm:p-5', className)}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
          <Icon strokeWidth={1.75} className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 id={id} className="text-md font-semibold text-fg">
            {title}
          </h2>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
