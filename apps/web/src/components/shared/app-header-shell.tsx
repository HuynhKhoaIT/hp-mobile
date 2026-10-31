'use client';

// Khung <header> của AppHeader. Trang chủ "/" trên điện thoại (< 640px) có header xanh riêng (lời chào, chọn khu, chuông,
// ô tìm dính — features/home/components/hub-header.tsx) nên header chung ẩn ở đó để không thành hai header chồng nhau.
// Từ 640px header chung luôn hiện (điều hướng nhất quán mọi trang). usePathname chạy cả khi render server → không nháy.
import type { ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function AppHeaderShell({ className, children }: { className?: string; children: ReactNode }) {
  const pathname = usePathname();
  return <header className={cn(className, pathname === '/' && 'max-sm:hidden')}>{children}</header>;
}
