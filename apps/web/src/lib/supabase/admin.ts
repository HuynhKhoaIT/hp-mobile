// Supabase client quyền service role — BỎ QUA RLS. Chỉ dùng trong server action của app/[locale]/admin/**
// (ESLint chặn import ở nơi khác). Luôn kiểm tra quyền người gọi ở server và ghi audit_log trước khi dùng.
import 'server-only';
import type { Database } from '@hp/db';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('Thiếu SUPABASE_SERVICE_ROLE_KEY (chỉ đặt ở server, không NEXT_PUBLIC_)');
  return createClient<Database>(publicEnv.supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
