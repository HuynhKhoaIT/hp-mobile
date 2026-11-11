'use client';

// Khung <header> của AppHeader. Trang chủ "/" trên điện thoại (< 640px) có header xanh riêng (lời chào, chọn khu, chuông,
// ô tìm dính — features/home/components/hub-header.tsx) nên header chung ẩn ở đó để không thành hai header chồng nhau.
// Mini-app (Chợ Pass Đồ /pass-do/*) cũng vậy: trên điện thoại header mini-app (← Super App, đã lưu, chuông, ô tìm) là header
// duy nhất, như mở một ứng dụng con.
// Từ 640px header chung luôn hiện (điều hướng nhất quán mọi trang). usePathname chạy cả khi render server → không nháy.
import type { ReactNode } from 'react';
import { miniAppBaseOf } from '@/features/listing/mini-app-routes';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function AppHeaderShell({ className, children }: { className?: string; children: ReactNode }) {
  const pathname = usePathname();
  const ownHeader = pathname === '/' || miniAppBaseOf(pathname) !== null;
  return <header className={cn(className, ownHeader && 'max-sm:hidden')}>{children}</header>;
}
