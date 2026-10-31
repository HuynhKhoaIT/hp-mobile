// Supabase client duy nhất của app. Chỉ import trong src/ (core, features); app/ đọc qua useSupabase() của @hp/core.
// URL polyfill: URL của React Native thiếu searchParams mà postgrest-js cần.
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@hp/db';
import { AppState } from 'react-native';
import { env } from './env';
import { authStorage, kv } from './storage';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: kv(authStorage),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // PKCE: Google OAuth trả `code` về hoaphat://auth/callback, app đổi code lấy phiên (verifier lưu MMKV).
    flowType: 'pkce',
  },
});

// Chỉ làm mới token khi app đang mở (khuyến nghị của Supabase cho React Native).
AppState.addEventListener('change', (state) => {
  if (state === 'active') void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});
