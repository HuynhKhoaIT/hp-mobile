// Gọi Edge Function do người dùng kích hoạt (supabase.functions.invoke) — .claude/rules/be-shared-packages.md.
// Function trả lỗi `{ code: 'errors.<code>', message }` (supabase/functions/_shared/http.ts) → Result với code '<code>'.
import { JoinGroupInput, type Locale, type MemberStatus, RequestBadgeInput, RespondJoinInput, TranslateContentInput } from '@hp/shared';
import { type Client, type ErrorCode, type Result, fail, ok } from './result';

type InvokeError = { name?: string; message?: string; context?: unknown };

/** Đọc mã lỗi từ phản hồi lỗi của function (FunctionsHttpError.context là Response). */
async function functionError(error: InvokeError): Promise<{ code: ErrorCode; message: string }> {
  if (error.name === 'FunctionsFetchError' || error.name === 'FunctionsRelayError') {
    return { code: 'network', message: error.message ?? 'network' };
  }
  const res = error.context as { json?: () => Promise<unknown>; status?: number } | undefined;
  if (res && typeof res.json === 'function') {
    try {
      const body = (await res.json()) as { code?: unknown; message?: unknown };
      if (typeof body.code === 'string') {
        const code = body.code.replace(/^errors\./, '');
        return { code: /^[a-z_]+$/.test(code) ? code : 'unknown', message: typeof body.message === 'string' ? body.message : code };
      }
    } catch {
      // body không phải JSON → theo status
    }
    if (res.status === 401) return { code: 'auth_required', message: 'auth_required' };
  }
  return { code: 'unknown', message: error.message ?? 'unknown' };
}

export async function invokeFunction<T>(client: Client, name: string, body: Record<string, unknown>): Promise<Result<T>> {
  const { data, error } = await client.functions.invoke<T>(name, { body });
  if (error) {
    const e = await functionError(error as InvokeError);
    return fail<T>(e.code, e.message);
  }
  return ok(data as T);
}

/** Xin / tham gia nhóm (join-group). Trả trạng thái mới: requested (chờ duyệt) | accepted. */
export async function joinGroup(client: Client, input: JoinGroupInput): Promise<Result<MemberStatus>> {
  const parsed = JoinGroupInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message === 'too_long' ? 'too_long' : 'invalid_input');
  const res = await invokeFunction<{ status: MemberStatus }>(client, 'join-group', parsed.data);
  return res.error ? res : ok(res.data.status);
}

/** Chủ nhóm nhận / từ chối người xin (respond-join). Trả accepted | declined. */
export async function respondJoin(client: Client, input: RespondJoinInput): Promise<Result<MemberStatus>> {
  const parsed = RespondJoinInput.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const res = await invokeFunction<{ status: MemberStatus }>(client, 'respond-join', parsed.data);
  return res.error ? res : ok(res.data.status);
}

/** Xin huy hiệu (request-badge) sau khi upload giấy tờ (uploadVerificationDocument). Trả id yêu cầu. */
export async function requestBadge(client: Client, input: RequestBadgeInput): Promise<Result<string>> {
  const parsed = RequestBadgeInput.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const res = await invokeFunction<{ id: string }>(client, 'request-badge', parsed.data);
  return res.error ? res : ok(res.data.id);
}

export type TranslatedContent = {
  title: string;
  description: string | null;
  lang: Locale;
  /** original: tin đã cùng ngôn ngữ; cache: bản dịch đã lưu; api: vừa dịch. */
  source: 'original' | 'cache' | 'api';
};

/** Nút "Dịch" (translate-content). Lỗi: translate_unavailable (chưa cấu hình API dịch), translate_failed, rate_limited. */
export async function translateContent(client: Client, input: TranslateContentInput): Promise<Result<TranslatedContent>> {
  const parsed = TranslateContentInput.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  return invokeFunction<TranslatedContent>(client, 'translate-content', parsed.data);
}
