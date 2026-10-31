// Mục thanh bên khu quản trị. Mỗi mục có `minRole`: moderator thấy mục moderator, admin thấy tất cả.
// Ẩn mục chỉ là giao diện — trang / action tự kiểm requireStaff(minRole) lại ở server.
// Thêm màn admin mới (apps/web/CLAUDE.md mục 10) = thêm một dòng ở đây + key `admin.nav.<key>`.
import { LayoutDashboard, type LucideIcon, ShieldCheck } from 'lucide-react';
import type { StaffRole } from './roles';

export type AdminNavKey = 'overview' | 'moderation';

export type AdminNavItem = {
  key: AdminNavKey;
  href: '/admin' | '/admin/moderation';
  Icon: LucideIcon;
  minRole: StaffRole;
  /** Hiện số tin chờ duyệt cạnh mục. */
  badge?: 'pending';
};

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { key: 'overview', href: '/admin', Icon: LayoutDashboard, minRole: 'moderator' },
  { key: 'moderation', href: '/admin/moderation', Icon: ShieldCheck, minRole: 'moderator', badge: 'pending' },
];

/**
 * `next` sau đăng nhập / MFA (đường dẫn đầy đủ do proxy.ts tạo, có thể có tiền tố /en, /zh): chỉ nhận đường dẫn nội bộ
 * trong khu /admin, trừ chính trang đăng nhập (chống open redirect / vòng lặp). Không hợp lệ → null (nơi gọi về /admin).
 */
export function safeAdminNext(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  const path = raw.replace(/^\/(en|zh)(?=[/?]|$)/, '');
  if (!/^\/admin([/?]|$)/.test(path) || /^\/admin\/login([/?]|$)/.test(path)) return null;
  return raw;
}
