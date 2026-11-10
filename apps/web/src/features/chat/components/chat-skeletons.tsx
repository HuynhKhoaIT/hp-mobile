// Skeleton đúng hình hộp thư / khung chat (giống ConversationRowSkeleton, ThreadSkeleton của app). Không spinner.
import { Skeleton } from '@/components/ui/skeleton';

export function ConversationRowSkeleton() {
  return (
    <div className="flex min-h-20 items-center gap-3 px-4 py-3">
      <Skeleton className="size-12 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <Skeleton className="size-12 rounded-sm" />
    </div>
  );
}

export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {Array.from({ length: count }, (_, i) => (
        <ConversationRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div className="flex flex-1 flex-col justify-end gap-3 px-4 pb-4">
      <Skeleton className="h-10 w-2/3 self-start rounded-xl" />
      <Skeleton className="h-10 w-1/2 self-end rounded-xl" />
      <Skeleton className="h-16 w-3/4 self-start rounded-xl" />
      <Skeleton className="h-10 w-2/5 self-end rounded-xl" />
    </div>
  );
}

/** Cả khung chat khi chưa có dữ liệu (fallback Suspense của trang hội thoại). */
export function ThreadSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex min-h-14 items-center gap-2 border-b border-border px-4 py-1">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      <MessagesSkeleton />
      <div className="border-t border-border p-2">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
