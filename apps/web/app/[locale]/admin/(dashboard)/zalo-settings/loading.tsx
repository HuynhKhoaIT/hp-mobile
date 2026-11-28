// Đang chuyển trang: khung + skeleton đúng hình (thanh bên / thanh trên giữ nguyên).
import { AdminPage, HeaderSkeleton } from '@/components/admin/states';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <AdminPage>
      <HeaderSkeleton />
      <Skeleton className="h-96 w-full rounded-lg" aria-hidden />
    </AdminPage>
  );
}
