'use client';

// Số thông báo chưa đọc của người đang đăng nhập (countUnreadNotifications, RLS: chỉ thông báo của mình).
// Header chung (desktop) và header trang chủ (điện thoại) cùng hiện chuông → gộp một lần gọi: dùng chung promise trong
// 30 giây. Khách → null (không gọi). Web chưa có Realtime cho thông báo: đọc lại khi tab được mở lại (visibilitychange).
import { countUnreadNotifications } from '@hp/core';
import { createBrowserClient } from '@/lib/supabase/client';

const TTL_MS = 30_000;
let cached: { at: number; promise: Promise<number | null> } | null = null;

async function fetchUnread(): Promise<number | null> {
  const client = createBrowserClient();
  const { data } = await client.auth.getSession();
  if (!data.session) return null;
  const res = await countUnreadNotifications(client);
  return res.error ? null : res.data;
}

export function loadUnreadCount(force = false): Promise<number | null> {
  const now = Date.now();
  if (!force && cached && now - cached.at < TTL_MS) return cached.promise;
  const promise = fetchUnread().catch(() => null);
  cached = { at: now, promise };
  return promise;
}
