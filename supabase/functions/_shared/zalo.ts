// Logic thuần cho zalo-connect / zalo-send: đọc input, map lỗi RPC → AppError. Cùng luật với Zod ở @hp/shared
// (schemas/actions/zalo.ts) — không import Zod vì Deno không phân giải import không đuôi của packages/shared.
import { AppError } from './http.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj = (body: unknown): Record<string, unknown> =>
  body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};

export const ZALO_TARGETS = ['lead', 'user'] as const;
export const ZALO_KINDS = ['lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request'] as const;
export const ZALO_CONTENT_MAX = 2000;

export type ZaloTarget = (typeof ZALO_TARGETS)[number];
export type ZaloKind = (typeof ZALO_KINDS)[number];

/** { action: 'start' | 'disconnect' } cho zalo-connect. */
export function parseZaloConnectInput(body: unknown): { action: 'start' | 'disconnect' } {
  const b = obj(body);
  if (b.action !== 'start' && b.action !== 'disconnect') throw new AppError('invalid_input', 400);
  return { action: b.action };
}

/** { targetType, targetId, kind, content } cho zalo-send; SĐT không đi qua client (RPC tra theo đối tượng). */
export function parseZaloSendInput(body: unknown): { targetType: ZaloTarget; targetId: string; kind: ZaloKind; content: string } {
  const b = obj(body);
  if (typeof b.targetType !== 'string' || !(ZALO_TARGETS as readonly string[]).includes(b.targetType)) throw new AppError('invalid_input', 400);
  if (typeof b.targetId !== 'string' || !UUID.test(b.targetId)) throw new AppError('invalid_input', 400);
  if (typeof b.kind !== 'string' || !(ZALO_KINDS as readonly string[]).includes(b.kind)) throw new AppError('invalid_input', 400);
  if (typeof b.content !== 'string') throw new AppError('invalid_input', 400);
  const content = b.content.trim();
  if (content.length < 1) throw new AppError('invalid_input', 400);
  if (content.length > ZALO_CONTENT_MAX) throw new AppError('too_long', 400);
  return { targetType: b.targetType as ZaloTarget, targetId: b.targetId, kind: b.kind as ZaloKind, content };
}

const STATUS: Record<string, number> = { invalid_input: 400, not_found: 404, no_phone: 422 };

/** Lỗi RPC (reserve_zalo_auto…) → AppError; không có lỗi → null. 42501 = không phải staff. */
export function zaloRpcError(error: { code?: string; message?: string } | null): AppError | null {
  if (!error) return null;
  if (error.code === '42501') return new AppError('forbidden', 403);
  if (error.code === 'P0001') {
    const code = error.message ?? 'unknown';
    return new AppError(code, STATUS[code] ?? 409);
  }
  return new AppError('unknown', 500);
}
