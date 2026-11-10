// Logic thuần cho join-group / respond-join (test được không cần DB): đọc input, map lỗi RPC → AppError.
// Cùng luật với JoinGroupInput / RespondJoinInput (@hp/shared schemas/functions/groups.ts) — không import Zod
// vì Deno không phân giải import không đuôi của packages/shared.
import { GROUP_RULES } from '../../../packages/shared/src/group-display.ts';
import { AppError } from './http.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const obj = (body: unknown): Record<string, unknown> =>
  body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};

export function parseJoinInput(body: unknown): { groupId: string; note: string | null } {
  const b = obj(body);
  if (typeof b.groupId !== 'string' || !UUID.test(b.groupId)) throw new AppError('invalid_input', 400);
  if (b.note !== undefined && b.note !== null && typeof b.note !== 'string') throw new AppError('invalid_input', 400);
  const note = typeof b.note === 'string' ? b.note.trim() : '';
  if (note.length > GROUP_RULES.noteMax) throw new AppError('too_long', 400);
  return { groupId: b.groupId, note: note || null };
}

export function parseRespondInput(body: unknown): { groupId: string; userId: string; accept: boolean } {
  const b = obj(body);
  if (typeof b.groupId !== 'string' || !UUID.test(b.groupId)) throw new AppError('invalid_input', 400);
  if (typeof b.userId !== 'string' || !UUID.test(b.userId)) throw new AppError('invalid_input', 400);
  if (typeof b.accept !== 'boolean') throw new AppError('invalid_input', 400);
  return { groupId: b.groupId, userId: b.userId, accept: b.accept };
}

/** HTTP status theo mã nghiệp vụ (P0001 từ join_group_tx / respond_join_tx). */
const STATUS: Record<string, number> = {
  auth_required: 401,
  banned: 403,
  forbidden: 403,
  blocked: 403,
  not_found: 404,
  cannot_join_own: 409,
  group_closed: 409,
  group_full: 409,
  already_joined: 409,
  join_declined: 409,
  message_has_phone: 400,
  message_profanity: 400,
  invalid_input: 400,
  rate_limited: 429,
};

/** Lỗi PostgREST khi gọi RPC → AppError. P0001 mang mã nghiệp vụ ở message; còn lại → unknown 500. */
export function rpcError(error: { code?: string; message?: string } | null): AppError | null {
  if (!error) return null;
  if (error.code === 'P0001' && error.message && STATUS[error.message]) {
    return new AppError(error.message, STATUS[error.message]);
  }
  if (error.code === '42501') return new AppError('forbidden', 403);
  return new AppError('unknown', 500);
}
