// Skeleton đúng hình hộp thư (thẻ hội thoại) / khung chat (giống ConversationRowSkeleton, ThreadSkeleton của app).
// Không spinner. Header khung chat: dải primary với khối chờ on-primary/15 (giống header xanh thật).
import { Skeleton } from '@/components/ui/skeleton';

export function ConversationRowSkeleton() {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <Skeleton className="size-12 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 px-4 pt-3 pb-4 lg:px-3">
      {Array.from({ length: count }, (_, i) => (
        <ConversationRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div className="flex flex-1 flex-col justify-end gap-3 bg-bg px-4 pb-4">
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
      <div className="flex min-h-16 items-center gap-2.5 bg-primary px-4 py-2">
        <span className="size-11 rounded-full bg-on-primary/15" />
        <span className="h-5 w-32 rounded-full bg-on-primary/15" />
      </div>
      <MessagesSkeleton />
      <div className="border-t border-border p-2">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
