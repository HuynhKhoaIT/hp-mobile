// Cổng bật / tắt mini-app cho route web (admin cấu hình ở /admin/catalog — bảng mini_apps). Đặt trong layout.tsx của gốc từng
// mini-app (/pass-do, /tro, /viec-lam, /that-lac, /ghep-xe, /ghep-tran): đang bật → hiện trang; đang tắt → 404 (ẩn hẳn, trang
// con và link chia sẻ cũng bị chặn). Đọc cấu hình đã cache 5 phút + tag `mini-apps` (getMiniApps — fail-open khi lỗi đọc).
import type { MiniAppCode } from '@hp/shared';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { isMiniAppOn } from '../mini-apps';

export async function MiniAppGate({ code, children }: { code: MiniAppCode; children: ReactNode }) {
  if (!(await isMiniAppOn(code))) notFound();
  return children;
}
