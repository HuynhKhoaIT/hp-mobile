// Số liệu dashboard /admin + badge thanh bên (RPC admin_stats, staff; theo request, không cache).
import 'server-only';
import { type AdminStats, getAdminStats } from '@hp/core';
import { requireStaff } from '../session';
import { staffOrThrow, unwrap } from '../lib/server';

/** Dashboard: lỗi → ném mã (error.tsx thử lại). */
export async function getDashboardStats(): Promise<AdminStats> {
  const staff = await staffOrThrow();
  return unwrap(await getAdminStats(staff.supabase));
}

/** Badge số ở thanh bên: lỗi → null (ẩn badge, không làm hỏng layout). */
export async function getNavStats(): Promise<AdminStats | null> {
  const check = await requireStaff();
  if (!check.ok) return null;
  const res = await getAdminStats(check.staff.supabase);
  return res.error ? null : res.data;
}
