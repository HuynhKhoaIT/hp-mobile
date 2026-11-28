// Đang chuyển trang: khung + skeleton đúng hình (thanh bên / thanh trên giữ nguyên).
import { AdminPage, HeaderSkeleton, TableSkeleton } from '@/components/admin/states';

export default function Loading() {
  return (
    <AdminPage>
      <HeaderSkeleton />
      <TableSkeleton />
    </AdminPage>
  );
}
