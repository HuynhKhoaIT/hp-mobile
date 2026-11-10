// Khung các trang admin sau đăng nhập: thanh bên + thanh trên (AdminShell kiểm phiên staff lại ở server).
// Đọc phiên / cookie theo request → trong Suspense; fallback là khung trống đúng hình.
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { AdminShell, AdminShellSkeleton } from '@/features/admin/shell/admin-shell';

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
