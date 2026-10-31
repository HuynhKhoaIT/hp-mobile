// Vai trò staff (thuần, dùng được ở server lẫn client). Client chỉ dùng để ẩn / hiện — server (requireStaff) và RLS quyết định.
import type { Role } from '@hp/shared';

export type StaffRole = Extract<Role, 'moderator' | 'admin'>;

const ROLE_RANK: Record<Role, number> = { user: 0, moderator: 1, admin: 2 };

/** `role` có đủ quyền `minRole` không (admin ⊃ moderator). Vai trò lạ → không. */
export function hasRole(role: string, minRole: StaffRole): role is StaffRole {
  return role in ROLE_RANK && ROLE_RANK[role as Role] >= ROLE_RANK[minRole];
}
