// Logic thuần cho request-badge, translate-content, purge-files (test được không cần DB / mạng): đọc input, map lỗi RPC,
// gọi API dịch qua fetch truyền vào, gom đường dẫn Storage. Cùng luật với Zod ở @hp/shared (RequestBadgeInput,
// TranslateContentInput) — không import Zod vì Deno không phân giải import không đuôi của packages/shared.
import { AppError } from './http.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj = (body: unknown): Record<string, unknown> =>
  body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};

// ── request-badge ──────────────────────────────────────────────────────────────────
export const BADGES = ['worker', 'landlord', 'venue', 'employer'] as const;
export type Badge = (typeof BADGES)[number];

/** { badge, documentPath } — path `{user_id}/{badge}/{timestamp}.{webp|jpg|pdf}` (RPC kiểm lại theo auth.uid()). */
export function parseBadgeInput(body: unknown): { badge: Badge; documentPath: string } {
  const b = obj(body);
  if (typeof b.badge !== 'string' || !(BADGES as readonly string[]).includes(b.badge)) throw new AppError('invalid_input', 400);
  if (typeof b.documentPath !== 'string' || !/^[0-9a-f-]{36}\/[a-z]+\/[0-9]{10,16}\.(webp|jpg|pdf)$/.test(b.documentPath)) {
    throw new AppError('invalid_input', 400);
  }
  return { badge: b.badge as Badge, documentPath: b.documentPath };
}

/** HTTP status theo mã nghiệp vụ (P0001 từ request_badge_tx). */
const BADGE_STATUS: Record<string, number> = {
  auth_required: 401,
  banned: 403,
  invalid_input: 400,
  document_missing: 400,
  badge_owned: 409,
  already_requested: 409,
  rate_limited: 429,
};

export function badgeRpcError(error: { code?: string; message?: string } | null): AppError | null {
  if (!error) return null;
  if (error.code === 'P0001' && error.message && BADGE_STATUS[error.message]) {
    return new AppError(error.message, BADGE_STATUS[error.message]);
  }
  if (error.code === '42501') return new AppError('forbidden', 403);
  return new AppError('unknown', 500);
}

// ── translate-content ──────────────────────────────────────────────────────────────
export const LANGS = ['vi', 'en', 'zh'] as const;
export type Lang = (typeof LANGS)[number];
/** Lượt dịch mới (không tính cache) mỗi người / giờ — RATE_LIMITS.translatePerHour. */
export const TRANSLATE_PER_HOUR = 30;

export function parseTranslateInput(body: unknown): { listingId: string; lang: Lang } {
  const b = obj(body);
  if (typeof b.listingId !== 'string' || !UUID.test(b.listingId)) throw new AppError('invalid_input', 400);
  if (typeof b.lang !== 'string' || !(LANGS as readonly string[]).includes(b.lang)) throw new AppError('invalid_input', 400);
  return { listingId: b.listingId, lang: b.lang as Lang };
}

/** Mã ngôn ngữ của Google Translate v2 (zh → tiếng Trung giản thể). */
export const googleLang = (lang: Lang) => (lang === 'zh' ? 'zh-CN' : lang);

/** Thực thể HTML Google trả trong bản dịch dạng text. */
function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Dịch [tiêu đề, mô tả?] bằng Google Cloud Translation v2 (API key). Lỗi mạng / quota → AppError translate_failed 502.
 * fetchFn truyền vào để test không gọi mạng.
 */
export async function translateGoogle(
  fetchFn: typeof fetch,
  apiKey: string,
  texts: string[],
  source: Lang,
  target: Lang,
): Promise<string[]> {
  const res = await fetchFn(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, source: googleLang(source), target: googleLang(target), format: 'text' }),
  });
  if (!res.ok) throw new AppError('translate_failed', 502);
  const json = (await res.json()) as { data?: { translations?: { translatedText?: string }[] } };
  const out = json.data?.translations?.map((t) => decodeEntities(t.translatedText ?? ''));
  if (!out || out.length !== texts.length) throw new AppError('translate_failed', 502);
  return out;
}

// ── purge-files ────────────────────────────────────────────────────────────────────
/** Giữ giấy tờ / tài khoản đã xoá mềm bao nhiêu ngày trước khi xoá hẳn (Nghị định 13, ARCHITECTURE mục 11). */
export const PURGE_AFTER_DAYS = 30;
/** Mỗi lần chạy tối đa bấy nhiêu tài khoản (cron hằng ngày, phần còn lại để hôm sau). */
export const PURGE_BATCH = 50;

export const daysAgoIso = (days: number, now = new Date()) => new Date(now.getTime() - days * 86_400_000).toISOString();

/** Bucket + thư mục gốc chứa file của một người dùng (path bắt đầu bằng user_id). */
export const userFolders = (userId: string) => [
  { bucket: 'avatars', prefix: userId },
  { bucket: 'listing-images', prefix: userId },
  { bucket: 'verification', prefix: userId },
];

type ListFn = (prefix: string) => Promise<{ name: string; id: string | null }[]>;

/** Mọi file dưới prefix (Storage list không đệ quy: mục có id null là thư mục con). */
export async function listAllFiles(list: ListFn, prefix: string, depth = 0): Promise<string[]> {
  if (depth > 4) return [];
  const out: string[] = [];
  for (const item of await list(prefix)) {
    const path = `${prefix}/${item.name}`;
    if (item.id === null) out.push(...(await listAllFiles(list, path, depth + 1)));
    else out.push(path);
  }
  return out;
}
