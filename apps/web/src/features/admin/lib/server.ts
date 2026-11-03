// Tiện ích phía server cho queries / actions admin: phiên staff theo vai trò, mở Result, khuôn Server Action.
// Thứ tự mỗi action (.claude/rules/web-admin.md): input → requireStaff(minRole) kiểm LẠI ở server → @hp/core (RLS + trigger /
// RPC ghi audit_log trong cùng transaction, không ghi đôi ở đây) → làm mới cache → ActionResult.
import 'server-only';
import type { Result } from '@hp/core';
import { revalidatePath } from 'next/cache';
import { type ActionResult, err, fromResult } from '@/lib/action-result';
import { requireStaff, type StaffRole, type StaffSession } from '../session';

/** Lỗi đọc dữ liệu → ném mã (error.tsx của segment hiện nút thử lại). */
export function unwrap<T>(result: Result<T>): T {
  if (result.error) throw new Error(result.error.code);
  return result.data;
}

/** Phiên staff cho queries; không đủ quyền → ném mã (forbidden / auth_required / mfa_required). */
export async function staffOrThrow(minRole: StaffRole = 'moderator'): Promise<StaffSession> {
  const check = await requireStaff(minRole);
  if (!check.ok) throw new Error(check.code);
  return check.staff;
}

/** Khuôn Server Action admin: kiểm phiên + vai trò ở server rồi chạy `fn` với client theo phiên staff. */
export async function withStaff<T>(minRole: StaffRole, fn: (staff: StaffSession) => Promise<Result<T>>): Promise<ActionResult<T>> {
  const check = await requireStaff(minRole);
  if (!check.ok) return err(check.code);
  return fromResult(await fn(check.staff));
}

/** Làm mới toàn khu /admin (badge số ở thanh bên + trang đang mở; client tự làm mới trong cùng lượt action). */
export function refreshAdmin() {
  revalidatePath('/[locale]/admin', 'layout');
}

/** Input thô của action → object (không phải object → rỗng, hàm @hp/core sẽ trả invalid_input). */
export function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}
