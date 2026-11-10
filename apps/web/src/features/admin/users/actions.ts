'use server';

// Server Action người dùng. Quyền kiểm LẠI ở server theo hành động (.claude/rules/web-admin.md):
//   moderator+: khoá tạm N ngày / mở khoá, sửa huy hiệu · chỉ admin: cấm vĩnh viễn / bỏ cấm, đổi vai trò.
// Thêm (app): không thao tác trên chính mình (trigger audit bỏ qua tự sửa → mất dấu vết); moderator không thao tác trên
// staff khác. RLS + guard trigger trg_profiles_guard vẫn là chốt cuối; trigger trg_profiles_audit ghi
// `user.suspend|unsuspend|ban|unban|role|badges` (không ghi đôi ở đây).
import { fail, getUserRole, setUserBadges, setUserBanned, setUserRole, suspendUser, type Result } from '@hp/core';
import type { ActionResult } from '@/lib/action-result';
import { asRecord, refreshAdmin, withStaff } from '../lib/server';
import type { StaffSession } from '../session';
import type { StaffRole } from '../roles';

async function guarded(
  minRole: StaffRole,
  raw: unknown,
  fn: (staff: StaffSession, v: Record<string, unknown>) => Promise<Result<null>>,
): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  const result = await withStaff(minRole, async (staff) => {
    if (v.userId === staff.userId) return fail('forbidden', 'self');
    const target = await getUserRole(staff.supabase, v.userId);
    if (target.error) return target;
    if (staff.role !== 'admin' && target.data.role !== 'user') return fail('forbidden', 'staff_target');
    return fn(staff, v);
  });
  if (result.ok) refreshAdmin();
  return result;
}

/** Khoá tạm 1 / 3 / 7 / 30 ngày, hoặc mở khoá (`days: null`). */
export async function suspendUserAction(raw: unknown): Promise<ActionResult<null>> {
  return guarded('moderator', raw, (s, v) => suspendUser(s.supabase, { userId: v.userId, days: v.days }));
}

/** Cấm vĩnh viễn / bỏ cấm — chỉ admin. */
export async function setUserBannedAction(raw: unknown): Promise<ActionResult<null>> {
  return guarded('admin', raw, (s, v) => setUserBanned(s.supabase, { userId: v.userId, banned: v.banned }));
}

/** Đổi vai trò — chỉ admin. */
export async function setUserRoleAction(raw: unknown): Promise<ActionResult<null>> {
  return guarded('admin', raw, (s, v) => setUserRole(s.supabase, { userId: v.userId, role: v.role }));
}

/** Đặt lại huy hiệu (staff). */
export async function setUserBadgesAction(raw: unknown): Promise<ActionResult<null>> {
  return guarded('moderator', raw, (s, v) => setUserBadges(s.supabase, { userId: v.userId, badges: v.badges }));
}
