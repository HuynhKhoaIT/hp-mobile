// Cấu hình bật / tắt mini-app (bảng `mini_apps` — migration 20261127090000). Admin bật / tắt ở /admin/catalog; app + web
// ẩn ô ở Hub và chặn route khi tắt. Chỉ import type: file được node --test chạy trực tiếp.
import type { Feature } from './enums';
import type { HomeTile } from './home';

/** Mã mini-app = 6 tính năng (`FEATURES`) + `goiTho` (Gọi thợ — không phải một Feature). Khớp CHECK của `mini_apps.code`. */
export const MINI_APP_CODES = ['pass', 'room', 'job', 'lostFound', 'ride', 'sport', 'goiTho'] as const;
export type MiniAppCode = (typeof MINI_APP_CODES)[number];

/** Biên dịch lỗi nếu có Feature nào không phải mã mini-app. */
export const FEATURES_ARE_MINI_APPS: Feature extends MiniAppCode ? true : never = true;

export type MiniAppState = { code: MiniAppCode; isEnabled: boolean; sortOrder: number };

/**
 * Giá trị khi chưa tải được cấu hình (mạng lỗi, chưa có cache): fail-open — 6 mini-app hiện có bật để Hub không trống;
 * Gọi thợ tắt vì chưa phát hành. Cũng là thứ tự mặc định.
 */
export const DEFAULT_MINI_APPS: readonly MiniAppState[] = [
  { code: 'pass', isEnabled: true, sortOrder: 10 },
  { code: 'room', isEnabled: true, sortOrder: 20 },
  { code: 'job', isEnabled: true, sortOrder: 30 },
  { code: 'lostFound', isEnabled: true, sortOrder: 40 },
  { code: 'ride', isEnabled: true, sortOrder: 50 },
  { code: 'sport', isEnabled: true, sortOrder: 60 },
  { code: 'goiTho', isEnabled: false, sortOrder: 70 },
];

export function isMiniAppCode(value: unknown): value is MiniAppCode {
  return typeof value === 'string' && (MINI_APP_CODES as readonly string[]).includes(value);
}

/**
 * Gộp dòng DB lên mặc định: dòng lạ (mã không biết) bị bỏ, mã thiếu dòng dùng mặc định, sắp theo `sortOrder` rồi theo thứ
 * tự mặc định. `null` / `undefined` (chưa tải) → mặc định.
 */
export function resolveMiniApps(
  rows: readonly { code: string; isEnabled: boolean; sortOrder: number }[] | null | undefined,
): MiniAppState[] {
  const byCode = new Map<MiniAppCode, MiniAppState>(DEFAULT_MINI_APPS.map((s) => [s.code, { ...s }]));
  for (const row of rows ?? []) {
    if (isMiniAppCode(row.code)) {
      byCode.set(row.code, { code: row.code, isEnabled: row.isEnabled, sortOrder: row.sortOrder });
    }
  }
  const order = (code: MiniAppCode) => MINI_APP_CODES.indexOf(code);
  return [...byCode.values()].sort((a, b) => a.sortOrder - b.sortOrder || order(a.code) - order(b.code));
}

export function isMiniAppEnabled(states: readonly MiniAppState[], code: MiniAppCode): boolean {
  return states.find((s) => s.code === code)?.isEnabled ?? false;
}

/** Mã đang bật, theo thứ tự hiển thị. */
export function enabledMiniApps(states: readonly MiniAppState[]): MiniAppCode[] {
  return states.filter((s) => s.isEnabled).map((s) => s.code);
}

/**
 * Ô lưới Hub theo cấu hình admin (app + web dùng chung): ô dịch vụ của mini-app đang tắt bị ẩn, ô dịch vụ còn lại xếp theo
 * thứ tự admin đặt, ô tiện ích (Tin của tôi, Tất cả) giữ nguyên ở cuối.
 */
export function visibleHomeTiles(tiles: readonly HomeTile[], states: readonly MiniAppState[]): HomeTile[] {
  const rank = new Map<string, number>(states.map((s, i) => [s.code, i]));
  const services = tiles
    .filter((t) => t.kind === 'service' && isMiniAppEnabled(states, t.id))
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  return [...services, ...tiles.filter((t) => t.kind === 'utility')];
}
