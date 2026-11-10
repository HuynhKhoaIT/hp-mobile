// Đang chuyển sang hàng chờ: khung trang + skeleton đúng hình (thanh bên / thanh trên giữ nguyên).
import { QueueSkeleton } from '@/features/admin/moderation/components/queue-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function ModerationLoading() {
  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <QueueSkeleton />
    </div>
  );
}
