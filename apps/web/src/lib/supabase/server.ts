// Supabase client cho Server Component, Server Action, Route Handler. Phiên đăng nhập đọc từ cookie (@supabase/ssr).
// Mỗi request tạo client mới; truyền vào hàm @hp/core trong features/*/queries.ts và actions.ts.
import 'server-only';
import type { Database } from '@hp/db';
import { createServerClient as createSsrServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '@/lib/env';

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSsrServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Server Component không được ghi cookie; proxy.ts đã làm mới phiên trước đó.
        }
      },
    },
  });
}
