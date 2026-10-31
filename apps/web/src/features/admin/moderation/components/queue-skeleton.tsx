// Skeleton đúng hình hàng chờ: tab + chip lọc, các dòng (ảnh vuông + chữ), panel chi tiết bên phải trên desktop.
import { Skeleton } from '@/components/ui/skeleton';

function RowSkeleton() {
  return (
    <div className="flex gap-3 rounded-md border border-border bg-surface p-3">
      <Skeleton className="aspect-avatar w-20 shrink-0 rounded-sm" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-1">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function QueueToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="flex gap-4 border-b border-border pb-3">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-28" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-32 shrink-0 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function QueueSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <QueueToolbarSkeleton />
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:gap-6">
        <div className="flex flex-col gap-2 lg:col-span-5">
          <Skeleton className="h-14 w-full" />
          {Array.from({ length: 5 }, (_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
        <div className="hidden flex-col gap-4 rounded-md border border-border bg-surface p-6 lg:col-span-7 lg:flex">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-40" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-avatar w-full" />
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
