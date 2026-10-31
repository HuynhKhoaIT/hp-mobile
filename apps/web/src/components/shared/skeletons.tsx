// Skeleton đúng hình nội dung (không spinner). ListingCardSkeleton theo bố cục thẻ tin của app:
// ảnh 4:3 → tiêu đề 2 dòng → giá → khu vực + thời gian. Đổi bố cục thẻ tin → sửa cả đây và app (SkeletonListingCard).
import { Skeleton } from '@/components/ui/skeleton';

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface p-2 shadow-card">
      <Skeleton className="aspect-card w-full" />
      <Skeleton className="h-5 w-11/12" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TextLinesSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={i === lines - 1 ? 'h-5 w-2/3' : 'h-5 w-full'} />
      ))}
    </div>
  );
}
