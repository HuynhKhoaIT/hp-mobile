// Kiểu trả về thống nhất của Server Action (.claude/rules/web-server-actions.md): không throw ra client, không null khi lỗi.
// `code` là key errors.* (client dịch bằng t('errors.' + code)); `fieldErrors` theo path Zod ("title", "attributes.year").
import type { Result } from '@hp/core';

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; fieldErrors?: Record<string, string[]> };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const err = <T = never>(code: string, fieldErrors?: Record<string, string[]>): ActionResult<T> =>
  fieldErrors ? { ok: false, code, fieldErrors } : { ok: false, code };

/** Result của @hp/core → ActionResult (giữ code + fieldErrors). */
export function fromResult<T>(result: Result<T>): ActionResult<T> {
  return result.error ? err(result.error.code, result.error.fieldErrors) : ok(result.data);
}
