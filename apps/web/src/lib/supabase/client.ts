// Supabase client cho Client Component (chat Realtime, upload ảnh, hook TanStack của @hp/core qua SupabaseProvider).
'use client';

import type { Client } from '@hp/core';
import type { Database } from '@hp/db';
import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

let client: ReturnType<typeof createSsrBrowserClient<Database>> | undefined;

/** Một client cho cả tab trình duyệt. */
export function createBrowserClient() {
  client ??= createSsrBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  return client;
}

/**
 * Lúc render trên server (SSR / prerender), Client Component vẫn chạy nhưng hook @hp/core không gọi mạng ở đó (query chỉ
 * chạy ở trình duyệt; phiên / Realtime trong useEffect). Không tạo client thật: createBrowserClient đòi cookie, còn
 * createClient của supabase-js tự khởi tạo Auth (đọc phiên, Date.now) ngay — Cache Components báo lỗi khi prerender.
 * Thay bằng đối tượng rỗng: chỉ để có context; lỡ bị dùng ở server thì báo lỗi rõ ràng.
 */
const serverStub = new Proxy(
  {},
  {
    get(_target, prop) {
      // React / thư viện có thể dò `then` (thenable) hay symbol — trả undefined, không ném.
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      throw new Error(`Supabase client chỉ dùng ở trình duyệt (truy cập "${prop}" khi render server)`);
    },
  },
) as unknown as Client;

/** Client cho <SupabaseProvider> (components/shared/data-provider.tsx): trình duyệt → createBrowserClient; server → stub. */
export function createProviderClient(): Client {
  return typeof window !== 'undefined' ? createBrowserClient() : serverStub;
}
