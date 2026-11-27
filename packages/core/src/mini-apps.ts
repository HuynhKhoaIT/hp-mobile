// Cấu hình bật / tắt mini-app (bảng `mini_apps` — migration 20261127090000). Đọc: mọi người (anon + user). Sửa: chỉ admin (RLS
// `mini_apps_update_admin`; audit `mini_app.update` do trigger DB). Logic gộp mặc định / fail-open ở @hp/shared (resolveMiniApps).
import type { Tables } from '@hp/db';
import { isMiniAppCode, MINI_APP_CODES, type MiniAppCode, type MiniAppState, resolveMiniApps } from '@hp/shared';
import { type Client, fail, fromSupabase, ok, type Result } from './result';

type MiniAppRow = Pick<Tables<'mini_apps'>, 'code' | 'is_enabled' | 'sort_order'>;

/**
 * Cấu hình đã gộp mặc định, theo thứ tự hiển thị. Lỗi đọc → trả lỗi (hook TanStack giữ cache cũ / dùng mặc định fail-open,
 * không cache dữ liệu giả).
 */
export async function listMiniApps(client: Client): Promise<Result<MiniAppState[]>> {
  const res = fromSupabase<MiniAppRow[]>(await client.from('mini_apps').select('code, is_enabled, sort_order').order('sort_order'));
  if (res.error) return res;
  return ok(resolveMiniApps((res.data ?? []).map((r) => ({ code: r.code, isEnabled: r.is_enabled, sortOrder: r.sort_order }))));
}

export type AdminMiniApp = MiniAppState & { updatedAt: string; updatedBy: string | null };

/** Mọi mini-app kèm lần sửa cuối (admin). Mã lạ trong DB bị bỏ. */
export async function listAdminMiniApps(client: Client): Promise<Result<AdminMiniApp[]>> {
  const res = fromSupabase<Tables<'mini_apps'>[]>(
    await client.from('mini_apps').select('code, is_enabled, sort_order, updated_at, updated_by, created_at').order('sort_order'),
  );
  if (res.error) return res;
  return ok(
    (res.data ?? []).flatMap((r) =>
      isMiniAppCode(r.code)
        ? [{ code: r.code, isEnabled: r.is_enabled, sortOrder: r.sort_order, updatedAt: r.updated_at, updatedBy: r.updated_by }]
        : [],
    ),
  );
}

/**
 * Đặt lại thứ tự hiển thị theo danh sách mã (admin): mã thứ i → `sort_order = (i + 1) × 10`. Phải là hoán vị đủ mọi mã
 * (không trùng, không thiếu). Mỗi dòng đổi ghi một audit `mini_app.update`. Không phải admin → `forbidden`.
 */
export async function reorderMiniApps(client: Client, codes: unknown): Promise<Result<null>> {
  if (!Array.isArray(codes) || codes.length !== MINI_APP_CODES.length || !codes.every(isMiniAppCode) || new Set(codes).size !== codes.length) {
    return fail('invalid_input');
  }
  for (const [i, code] of codes.entries()) {
    const res = await client
      .from('mini_apps')
      .update({ sort_order: (i + 1) * 10 })
      .eq('code', code)
      .select('code')
      .maybeSingle();
    if (res.error) return fromSupabase<null>({ data: null, error: res.error });
    if (!res.data) return fail('forbidden');
  }
  return ok(null);
}

/** Bật / tắt hoặc đổi thứ tự một mini-app (admin). Không có dòng bị chạm (không phải admin / mã sai) → `forbidden`. */
export async function updateMiniApp(
  client: Client,
  input: { code: unknown; isEnabled?: unknown; sortOrder?: unknown },
): Promise<Result<null>> {
  if (!isMiniAppCode(input.code)) return fail('invalid_input');
  const patch: { is_enabled?: boolean; sort_order?: number } = {};
  if (input.isEnabled !== undefined) {
    if (typeof input.isEnabled !== 'boolean') return fail('invalid_input');
    patch.is_enabled = input.isEnabled;
  }
  if (input.sortOrder !== undefined) {
    if (typeof input.sortOrder !== 'number' || !Number.isInteger(input.sortOrder) || Math.abs(input.sortOrder) > 10_000) {
      return fail('invalid_input');
    }
    patch.sort_order = input.sortOrder;
  }
  if (Object.keys(patch).length === 0) return fail('invalid_input');
  const code: MiniAppCode = input.code;
  const res = await client.from('mini_apps').update(patch).eq('code', code).select('code').maybeSingle();
  if (res.error) return fromSupabase<null>({ data: null, error: res.error });
  return res.data ? ok(null) : fail('forbidden');
}
