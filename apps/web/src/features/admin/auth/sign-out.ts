'use client';

// Đăng xuất khỏi khu quản trị rồi về trang đăng nhập admin (tải lại cả trang để bỏ dữ liệu theo phiên cũ).
import { signOut } from '@hp/core';
import type { Locale } from '@hp/shared';
import { withLocale } from '@/i18n/paths';
import { createBrowserClient } from '@/lib/supabase/client';

export async function signOutToAdminLogin(locale: Locale, query = ''): Promise<void> {
  await signOut(createBrowserClient());
  // Tải lại cả trang (không router.push): bỏ mọi dữ liệu RSC / client theo phiên cũ.
  const target = withLocale('/admin/login', locale) + query;
  window.location.assign(target);
}
