// Skeleton đúng hình nội dung (không spinner). ListingCardSkeleton theo bố cục ListingCard
// (src/features/listing/components/listing-card.tsx, khớp app): ảnh 4:3 tràn mép → badge → tiêu đề 2 dòng → giá → khu + thời gian.
// Đổi bố cục thẻ tin → sửa cả đây và app (SkeletonListingCard).
import { Skeleton } from '@/components/ui/skeleton';

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-md bg-surface shadow-card">
      <Skeleton className="aspect-card w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

/** Thẻ dạng hàng (việc làm, đồ thất lạc): ô vuông trái + chữ phải. */
export function ListingRowSkeleton() {
  return (
    <div className="flex gap-3 rounded-md bg-surface p-3 shadow-card">
      <Skeleton className="aspect-avatar w-24 shrink-0 rounded-sm sm:w-28" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

/** Lưới thẻ tin (dùng chung với ListingGrid): grid 2 / 3 / 4 cột; row 1 cột điện thoại, 2 cột từ tablet. */
export const LISTING_GRID_CLASS = {
  grid: 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4',
  row: 'grid grid-cols-1 gap-3 md:grid-cols-2',
} as const;

export function ListingGridSkeleton({ count = 8, layout = 'grid' }: { count?: number; layout?: 'grid' | 'row' }) {
  return (
    <div className={LISTING_GRID_CLASS[layout]}>
      {Array.from({ length: count }, (_, i) => (layout === 'row' ? <ListingRowSkeleton key={i} /> : <ListingCardSkeleton key={i} />))}
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
