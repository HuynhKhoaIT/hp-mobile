// Phiên staff phía server cho khu /admin (layout, queries, Server Actions). Kiểm LẠI ở server, không tin việc proxy.ts
// đã chặn hay nút đã ẩn (.claude/rules/web-admin.md):
//   1. JWT hợp lệ (getClaims kiểm chữ ký) và đã qua MFA (aal2);
//   2. vai trò đọc từ profiles (không chỉ claim trong JWT — claim có thể cũ tới 1 giờ sau khi bị thu quyền).
// RLS / RPC (is_staff()) vẫn là chốt cuối; hàm này để trả lỗi sớm, rõ ràng và để UI biết vai trò.
import 'server-only';
import { connection } from 'next/server';
import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { hasRole, type StaffRole } from './roles';

export type { StaffRole } from './roles';

export type StaffSession = {
  userId: string;
  role: StaffRole;
  /** Họ tên đầy đủ (staff tự xem của mình). */
  name: string;
  supabase: Awaited<ReturnType<typeof createServerClient>>;
};

export type StaffCheck = { ok: true; staff: StaffSession } | { ok: false; code: 'auth_required' | 'forbidden' | 'mfa_required' };

/** Kiểm phiên staff. Gọi trong mọi Server Action admin và trong layout (dedupe theo request bằng cache()). */
export const requireStaff = cache(async (minRole: StaffRole = 'moderator'): Promise<StaffCheck> => {
  // Dữ liệu staff luôn theo request: báo cho Next trước khi supabase-js đọc giờ (getClaims) để không lỗi
  // "unstable value Date.now() while prerendering" (cacheComponents).
  await connection();
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { ok: false, code: 'auth_required' };
  if (claims.aal !== 'aal2') return { ok: false, code: 'mfa_required' };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role,full_name,deleted_at')
    .eq('id', claims.sub)
    .maybeSingle();
  if (error || !profile || profile.deleted_at) return { ok: false, code: 'forbidden' };
  if (!hasRole(profile.role, minRole)) return { ok: false, code: 'forbidden' };

  return {
    ok: true,
    staff: { userId: claims.sub, role: profile.role, name: profile.full_name.trim(), supabase },
  };
});
