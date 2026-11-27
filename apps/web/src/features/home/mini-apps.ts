// Cấu hình bật / tắt mini-app phía server (bảng `mini_apps` — admin quản lý ở /admin/catalog). Đọc bằng client ẩn danh
// (createPublicClient — không cookie) để cache được bằng 'use cache' (.claude/rules/web-routing-rsc.md): 5 phút + tag `mini-apps`;
// setMiniAppAction của admin gọi updateTag('mini-apps') nên đổi có hiệu lực ngay. Không đọc DB trong proxy.ts.
// Fail-open: lỗi đọc (mạng, DB) → mặc định của @hp/shared (6 mini-app hiện có bật) — lỗi được NÉM trong hàm cache để không
// bị cache, rồi bắt ở getMiniApps.
import 'server-only';
import { listMiniApps } from '@hp/core';
import { isMiniAppEnabled, type MiniAppCode, type MiniAppState, resolveMiniApps } from '@hp/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

async function fetchMiniApps(): Promise<MiniAppState[]> {
  'use cache';
  cacheLife({ revalidate: 300 });
  cacheTag('mini-apps');
  const result = await listMiniApps(createPublicClient());
  if (result.error) throw new Error(result.error.code);
  return result.data;
}

/** Cấu hình đã gộp mặc định, theo thứ tự hiển thị. Không bao giờ ném lỗi. */
export async function getMiniApps(): Promise<MiniAppState[]> {
  try {
    return await fetchMiniApps();
  } catch {
    return resolveMiniApps(null);
  }
}

export async function isMiniAppOn(code: MiniAppCode): Promise<boolean> {
  return isMiniAppEnabled(await getMiniApps(), code);
}
