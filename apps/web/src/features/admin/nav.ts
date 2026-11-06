// Mục thanh bên khu quản trị. Mỗi mục có `minRole`: moderator thấy mục moderator, admin thấy tất cả.
// Ẩn mục chỉ là giao diện — trang / action tự kiểm requireStaff(minRole) lại ở server.
// Thêm màn admin mới (apps/web/CLAUDE.md mục 10) = thêm một dòng ở đây + key `admin.nav.<key>`.
import {
  BadgeCheck,
  CalendarClock,
  FileText,
  Flag,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  ScrollText,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import type { StaffRole } from './roles';

export type AdminNavKey =
  | 'overview'
  | 'moderation'
  | 'reports'
  | 'badges'
  | 'users'
  | 'listings'
  | 'groups'
  | 'catalog'
  | 'leads'
  | 'marketing'
  | 'audit';

export type AdminNavHref =
  | '/admin'
  | '/admin/moderation'
  | '/admin/reports'
  | '/admin/badges'
  | '/admin/users'
  | '/admin/listings'
  | '/admin/groups'
  | '/admin/catalog'
  | '/admin/leads'
  | '/admin/marketing'
  | '/admin/audit';

/** Số cạnh mục thanh bên: tin chờ duyệt, báo cáo mở, huy hiệu chờ, sân chờ duyệt, lead mới. */
export type AdminNavCount = 'pending' | 'reports' | 'badges' | 'venues' | 'leads';
export type AdminNavCounts = Partial<Record<AdminNavCount, number>>;

export type AdminNavItem = {
  key: AdminNavKey;
  href: AdminNavHref;
  Icon: LucideIcon;
  minRole: StaffRole;
  badge?: AdminNavCount;
};

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { key: 'overview', href: '/admin', Icon: LayoutDashboard, minRole: 'moderator' },
  { key: 'moderation', href: '/admin/moderation', Icon: ShieldCheck, minRole: 'moderator', badge: 'pending' },
  { key: 'reports', href: '/admin/reports', Icon: Flag, minRole: 'moderator', badge: 'reports' },
  { key: 'badges', href: '/admin/badges', Icon: BadgeCheck, minRole: 'moderator', badge: 'badges' },
  { key: 'users', href: '/admin/users', Icon: Users, minRole: 'moderator' },
  { key: 'listings', href: '/admin/listings', Icon: FileText, minRole: 'moderator' },
  { key: 'groups', href: '/admin/groups', Icon: CalendarClock, minRole: 'moderator' },
  // Catalog: moderator duyệt sân; tab khu / từ khoá cấm chỉ admin (lọc trong trang).
  { key: 'catalog', href: '/admin/catalog', Icon: Store, minRole: 'moderator', badge: 'venues' },
  { key: 'leads', href: '/admin/leads', Icon: Inbox, minRole: 'moderator', badge: 'leads' },
  { key: 'marketing', href: '/admin/marketing', Icon: Megaphone, minRole: 'admin' },
  { key: 'audit', href: '/admin/audit', Icon: ScrollText, minRole: 'admin' },
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
