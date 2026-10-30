// Kiểu trả về thống nhất của mọi hàm @hp/core: không throw, `code` là key i18n trong ns errors.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@hp/db';

export type Client = SupabaseClient<Database>;

export type ErrorCode =
  | 'unknown'
  | 'network'
  | 'invalid_input'
  | 'auth_required'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'banned'
  | (string & {}); // mã nghiệp vụ từ RPC / Edge Function (vd 'group_full')

export type AppError = { code: ErrorCode; message: string; fieldErrors?: Record<string, string[]> };
export type Result<T> = { data: T; error: null } | { data: null; error: AppError };

export const ok = <T>(data: T): Result<T> => ({ data, error: null });
export const fail = <T = never>(code: ErrorCode, message = code, fieldErrors?: Record<string, string[]>): Result<T> => ({
  data: null,
  error: fieldErrors ? { code, message, fieldErrors } : { code, message },
});

type PgLikeError = { code?: string; message?: string; details?: string | null; name?: string };

/** Map lỗi PostgREST / Postgres / mạng sang mã i18n. */
export function toAppError(err: unknown): AppError {
  const e = (err ?? {}) as PgLikeError;
  const message = e.message ?? 'unknown';
  switch (e.code) {
    case '42501':
      return { code: 'forbidden', message };
    case 'P0001':
      // RPC báo lỗi nghiệp vụ bằng raise exception ... message = '<code>'
      return { code: /^[a-z_]+$/.test(message) ? message : 'unknown', message };
    case '23505':
      return { code: 'conflict', message };
    case '23514':
    case '22P02':
    case '23502':
      return { code: 'invalid_input', message };
    case 'PGRST116':
      return { code: 'not_found', message };
    case 'PGRST301':
    case 'PGRST302':
      return { code: 'auth_required', message };
  }
  if (e.name === 'TypeError' || /fetch|network/i.test(message)) return { code: 'network', message };
  return { code: 'unknown', message };
}

/** Bọc kết quả `{ data, error }` của supabase-js. */
export function fromSupabase<T>(res: { data: T | null; error: unknown }, notFoundIfNull = false): Result<T> {
  if (res.error) return { data: null, error: toAppError(res.error) };
  if (res.data === null && notFoundIfNull) return fail('not_found');
  return ok(res.data as T);
}

/** Lấy id người dùng hiện tại; trả lỗi auth_required nếu chưa đăng nhập. */
export async function requireUserId(client: Client): Promise<Result<string>> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return fail('auth_required');
  return ok(data.user.id);
}

export const clampLimit = (limit: number | undefined, fallback = 20, max = 50) =>
  Math.min(Math.max(1, Math.floor(limit ?? fallback)), max);
