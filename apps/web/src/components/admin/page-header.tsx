// PageHeader — đầu mỗi trang admin: tiêu đề (h1), mô tả ngắn, vùng nút chính bên phải (xuống dòng trên điện thoại).
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold text-fg">{title}</h1>
        {description ? <p className="max-w-2xl text-md text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
