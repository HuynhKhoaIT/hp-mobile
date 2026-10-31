// Đọc phía server cho khu đăng nhập. Chạy theo request (đọc cookie) — gọi trong khối <Suspense>.
import 'server-only';
import { getMyProfile, listSites, type MyProfile, type Result, type Site } from '@hp/core';
import { createServerClient } from '@/lib/supabase/server';

/** Người dùng hiện tại từ JWT đã kiểm chữ ký (không query DB). null khi là khách. */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

/** Hồ sơ của chính mình (trang /toi). */
export async function getMyProfileForPage(): Promise<Result<MyProfile>> {
  const supabase = await createServerClient();
  return getMyProfile(supabase);
}

/** Danh mục địa điểm làm việc (đang hiện). */
export async function getSitesForPage(): Promise<Result<Site[]>> {
  const supabase = await createServerClient();
  return listSites(supabase);
}
