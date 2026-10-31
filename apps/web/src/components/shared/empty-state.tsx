// EmptyState — khối dữ liệu rỗng: biểu tượng + tiêu đề + mô tả + một hành động (giống EmptyState của app).
// Chữ do nơi gọi truyền vào (đã qua t()).
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Nút / link hành động (vd <Button asChild><Link …/></Button>). */
  action?: ReactNode;
}) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary-light text-primary">
        <Icon className="size-8" strokeWidth={1.75} aria-hidden />
      </div>
      <p className="text-lg font-semibold text-fg">{title}</p>
      {description ? <p className="max-w-sm text-md text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
