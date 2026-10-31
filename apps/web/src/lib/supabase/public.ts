// Supabase client ẩn danh (anon key, KHÔNG đọc cookie) cho dữ liệu công khai được cache bằng 'use cache'
// (features/*/queries.ts). Hàm 'use cache' không được đọc cookies() nên không dùng được createServerClient.
// Chỉ đọc view / RPC công khai đã che PII (public_listings, search_listings, get_listing_by_slug…) — RLS của vai trò anon
// quyết định. Không bao giờ dùng service role cho dữ liệu công khai.
import 'server-only';
import type { Database } from '@hp/db';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';

export function createPublicClient() {
  return createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
