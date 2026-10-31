// Supabase client cho Client Component (chat Realtime, upload ảnh, hook TanStack của @hp/core qua SupabaseProvider).
'use client';

import type { Database } from '@hp/db';
import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

let client: ReturnType<typeof createSsrBrowserClient<Database>> | undefined;

/** Một client cho cả tab trình duyệt. */
export function createBrowserClient() {
  client ??= createSsrBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  return client;
}
