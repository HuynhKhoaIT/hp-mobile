// Làm mới phiên Supabase trong proxy.ts và đọc claims (đã kiểm chữ ký JWT) để chặn route.
// Không query DB ở đây: vai trò lấy từ app_metadata.role do Auth Hook custom_access_token ghi vào JWT.
import type { Database } from '@hp/db';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import { publicEnv } from '@/lib/env';

export type SessionInfo = {
  userId: string | null;
  role: 'user' | 'moderator' | 'admin' | null;
  aal: string | null;
};

const ROLES = new Set(['user', 'moderator', 'admin']);

/** Ghi cookie phiên mới (nếu có) vào `response` và trả thông tin người dùng hiện tại. */
export async function updateSession(request: NextRequest, response: NextResponse): Promise<SessionInfo> {
  const supabase = createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims kiểm chữ ký JWT (khác getSession chỉ đọc cookie) và làm mới token khi sắp hết hạn.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { userId: null, role: null, aal: null };

  const meta = claims.app_metadata as { role?: unknown } | undefined;
  const role = typeof meta?.role === 'string' && ROLES.has(meta.role) ? (meta.role as SessionInfo['role']) : 'user';
  return { userId: claims.sub, role, aal: typeof claims.aal === 'string' ? claims.aal : null };
}
