// Báo cáo tin / nhóm / hồ sơ / tin nhắn (bảng reports, migration 20261102090000_chat).
import { ReportInput } from '@hp/shared';
import { type Client, fail, fromSupabase, ok, type Result, toAppError } from './result';

/**
 * Gửi báo cáo. Đã báo cáo (còn mở) → `{ already: true }` (không phải lỗi).
 * Lỗi: reason_required, too_long, forbidden (bị cấm), rate_limited (3 / giờ), invalid_input (tự báo cáo mình).
 */
export async function createReport(client: Client, input: ReportInput): Promise<Result<{ already: boolean }>> {
  const parsed = ReportInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid_input');
  const v = parsed.data;
  const res = await client
    .from('reports')
    .insert({ target_type: v.targetType, target_id: v.targetId, reason: v.reason, detail: v.detail || null });
  if (res.error) {
    if (toAppError(res.error).code === 'conflict') return ok({ already: true });
    return fromSupabase<{ already: boolean }>({ data: null, error: res.error });
  }
  return ok({ already: false });
}
