// Gọi thợ (migration 20261128090000_service_requests + 20261128100000_service_request_chat). Đọc công khai qua
// public_service_requests / search_service_requests / get_service_request (đã che PII: toạ độ làm tròn, không địa chỉ,
// anon được); chủ yêu cầu tạo / sửa qua PostgREST + RLS (bảng service_requests, guard ở trigger); mọi thao tác đổi
// trạng thái (báo giá, chọn, huỷ, hoàn thành, đánh giá, mở chat) là RPC security definer — client không ghi trực tiếp.
import type { Database } from '@hp/db';
import {
  CreateServiceRequestInput,
  type CreateServiceRequestValues,
  QuoteIdInput,
  RateServiceRequestInput,
  RequestIdInput,
  ServiceRequestFilters,
  StartRequestConversationInput,
  SubmitQuoteInput,
  UpdateServiceRequestInput,
} from '@hp/shared';
import { flattenIssues } from './profile';
import { type Client, type Result, fail, fromSupabase, ok, requireUserId } from './result';

type Views = Database['public']['Views'];

/** Một yêu cầu công khai (card + chi tiết). Không có địa chỉ; lat / lng làm tròn ~300 m. */
export type PublicServiceRequest = Views['public_service_requests']['Row'];
/** Yêu cầu của tôi (chủ): PublicServiceRequest + điểm tôi đã chấm thợ (`my_rating`). */
export type MyServiceRequest = Views['my_service_requests']['Row'];
/** Báo giá của tôi (thợ) + tóm tắt yêu cầu + điểm tôi đã chấm khách. */
export type MyServiceQuote = Views['my_service_quotes']['Row'];
/** Một báo giá của yêu cầu kèm hồ sơ rút gọn của thợ (tên "An N.", điểm uy tín). */
export type RequestQuote = Database['public']['Functions']['list_request_quotes']['Returns'][number];
/** Báo giá của chính mình cho một yêu cầu. */
export type MyQuoteForRequest = Pick<
  Database['public']['Tables']['service_quotes']['Row'],
  'id' | 'price' | 'available_at' | 'note' | 'status'
>;
/** Địa chỉ + toạ độ chính xác — chỉ chủ / thợ được chọn / staff (RLS). */
export type ServiceRequestPrivate = Database['public']['Functions']['get_service_request_private']['Returns'][number];

/** Cột client đọc từ public_service_requests / RPC. Thêm cột vào view → thêm ở đây. */
// prettier-ignore
export const SERVICE_REQUEST_COLUMNS = 'id,trade,status,title,description,images,site,site_name,lat,lng,budget_min,budget_max,urgency,quotes_count,expires_at,completed_at,lang,created_at,updated_at,customer_id,customer_name,customer_avatar_url,customer_rating_avg,customer_rating_count,customer_since,accepted_pro_id';

/** Cursor 2 cột: "<created_at>|<id>" của dòng cuối (nhiều yêu cầu có thể trùng giờ). */
export type ServiceRequestPage<T = PublicServiceRequest> = { items: T[]; nextCursor: string | null };
export type ServiceRequestQuery = ServiceRequestFilters & { cursor?: string | null; limit?: number };

function toPage<T extends { created_at: string; id: string }>(items: T[], limit: number): ServiceRequestPage<T> {
  const last = items.at(-1);
  return { items, nextCursor: items.length === limit && last ? `${last.created_at}|${last.id}` : null };
}

/** lat / lng → EWKT cho cột geography (PostgREST nhận chuỗi). */
function toPoint(lat: number | null | undefined, lng: number | null | undefined): string | null | undefined {
  if (lat === undefined && lng === undefined) return undefined;
  if (lat == null || lng == null) return null;
  return `SRID=4326;POINT(${lng} ${lat})`;
}

function invalid<T>(issues: { path: PropertyKey[]; message: string }[]): Result<T> {
  const first = issues[0];
  return fail<T>(first && /^[a-z_]+$/.test(first.message) ? first.message : 'invalid_input', 'invalid_input', flattenIssues(issues));
}

const voidResult = (res: { error: unknown }): Result<null> =>
  res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);

// ── Đọc công khai ────────────────────────────────────────────────────────────────────────────────

/** Yêu cầu đang mở (chưa hết hạn), mới nhất trước. */
export async function searchServiceRequests(client: Client, query: ServiceRequestQuery = {}): Promise<Result<ServiceRequestPage>> {
  const { cursor, limit: rawLimit, ...rest } = query;
  const parsed = ServiceRequestFilters.safeParse(rest);
  if (!parsed.success) return fail('invalid_input');
  const f = parsed.data;
  const limit = Math.min(Math.max(rawLimit ?? 20, 1), 50);
  const [cursorAt, cursorId] = cursor ? cursor.split('|') : [undefined, undefined];
  const res = await client
    .rpc('search_service_requests', {
      p_trade: f.trade,
      p_urgency: f.urgency,
      p_site: f.site,
      p_query: f.query || undefined,
      p_lat: f.lat,
      p_lng: f.lng,
      p_radius_m: f.radiusM,
      p_limit: limit,
      p_cursor_created_at: cursorAt,
      p_cursor_id: cursorId,
    })
    .select(SERVICE_REQUEST_COLUMNS);
  const result = fromSupabase<PublicServiceRequest[]>(res);
  return result.error ? result : ok(toPage(result.data ?? [], limit));
}

/** Chi tiết theo id (link /goi-tho/yeu-cau/{id}, push). Không thấy / bị ẩn → not_found. */
export async function getServiceRequest(client: Client, id: string): Promise<Result<PublicServiceRequest>> {
  const res = await client.rpc('get_service_request', { p_id: id }).select(SERVICE_REQUEST_COLUMNS).maybeSingle();
  return fromSupabase<PublicServiceRequest>(res, true);
}

/** Địa chỉ + toạ độ chính xác. Người không có quyền → data null (RLS trả 0 dòng), không phải lỗi. */
export async function getServiceRequestPrivate(client: Client, requestId: string): Promise<Result<ServiceRequestPrivate | null>> {
  const res = fromSupabase<ServiceRequestPrivate[]>(await client.rpc('get_service_request_private', { p_request_id: requestId }));
  return res.error ? res : ok(res.data?.[0] ?? null);
}

/** Báo giá của yêu cầu theo quyền xem: chủ thấy tất cả, thợ chỉ thấy của mình. */
export async function listRequestQuotes(client: Client, requestId: string): Promise<Result<RequestQuote[]>> {
  const res = fromSupabase<RequestQuote[]>(await client.rpc('list_request_quotes', { p_request_id: requestId }));
  return res.error ? res : ok(res.data ?? []);
}

/** Báo giá của chính mình cho yêu cầu (null = chưa báo giá / khách). */
export async function getMyQuote(client: Client, requestId: string): Promise<Result<MyQuoteForRequest | null>> {
  const { data: session } = await client.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return ok(null);
  const res = fromSupabase<MyQuoteForRequest | null>(
    await client
      .from('service_quotes')
      .select('id,price,available_at,note,status')
      .eq('request_id', requestId)
      .eq('pro_id', uid)
      .maybeSingle(),
  );
  return res.error ? res : ok(res.data ?? null);
}

// ── Chủ yêu cầu: tạo / sửa ───────────────────────────────────────────────────────────────────────

export type SavedServiceRequest = Pick<Database['public']['Tables']['service_requests']['Row'], 'id' | 'status' | 'expires_at'>;

/**
 * Đăng yêu cầu. Server đặt khách / trạng thái / hạn (7 ngày); site mặc định theo hồ sơ. Ảnh upload trước vào
 * `{userId}/{requestId}/…` — tạo id ở client bằng `crypto.randomUUID()` nếu cần path trước khi insert (không bắt buộc).
 * Lỗi: rate_limited (5 / ngày), message_has_phone, message_profanity, invalid_input, forbidden (bị cấm).
 */
export async function createServiceRequest(client: Client, input: CreateServiceRequestInput): Promise<Result<SavedServiceRequest>> {
  const parsed = CreateServiceRequestInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const uid = await requireUserId(client);
  if (uid.error) return uid;
  const v: CreateServiceRequestValues = parsed.data;
  return fromSupabase<SavedServiceRequest>(
    await client
      .from('service_requests')
      .insert({
        customer_id: uid.data,
        trade: v.trade,
        title: v.title,
        description: v.description,
        images: v.images,
        site: v.site,
        address_text: v.addressText,
        location: toPoint(v.lat, v.lng) ?? null,
        budget_min: v.budgetMin,
        budget_max: v.budgetMax,
        urgency: v.urgency,
        lang: v.lang,
      })
      .select('id,status,expires_at')
      .single(),
  );
}

/** Sửa yêu cầu (chủ; còn mở và chưa có báo giá — trigger báo request_closed / request_has_quotes). */
export async function updateServiceRequest(client: Client, input: UpdateServiceRequestInput): Promise<Result<SavedServiceRequest>> {
  const parsed = UpdateServiceRequestInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const { id, addressText, lat, lng, budgetMin, budgetMax, ...rest } = parsed.data;
  const location = toPoint(lat, lng);
  const patch = {
    ...rest,
    ...(addressText === undefined ? {} : { address_text: addressText }),
    ...(budgetMin === undefined ? {} : { budget_min: budgetMin }),
    ...(budgetMax === undefined ? {} : { budget_max: budgetMax }),
    ...(location === undefined ? {} : { location }),
  };
  return fromSupabase<SavedServiceRequest>(
    await client.from('service_requests').update(patch).eq('id', id).select('id,status,expires_at').maybeSingle(),
    true,
  );
}

/**
 * Upload một ảnh yêu cầu (đã nén webp / jpeg ≤ 2 MB) vào `{userId}/{requestId}/{index}-{ts}.{ext}` (bucket request-images).
 * Trả path để ghi vào service_requests.images. Lỗi: file_too_large, forbidden (bị cấm / sai thư mục), upload_failed.
 */
export async function uploadRequestImage(
  client: Client,
  v: { userId: string; requestId: string; index: number; body: ArrayBuffer | Blob; contentType: 'image/webp' | 'image/jpeg' },
): Promise<Result<string>> {
  const path = `${v.userId}/${v.requestId}/${v.index}-${Date.now()}.${v.contentType === 'image/webp' ? 'webp' : 'jpg'}`;
  const up = await client.storage.from('request-images').upload(path, v.body, { contentType: v.contentType, upsert: false });
  if (up.error) {
    const status = String((up.error as { statusCode?: string | number }).statusCode ?? '');
    return fail(status === '413' ? 'file_too_large' : status === '403' ? 'forbidden' : 'upload_failed');
  }
  return ok(path);
}

// ── Của tôi ──────────────────────────────────────────────────────────────────────────────────────

/** Yêu cầu tôi đăng, mới nhất trước (mọi trạng thái). */
export async function listMyServiceRequests(
  client: Client,
  opts: { cursor?: string | null; limit?: number } = {},
): Promise<Result<ServiceRequestPage<MyServiceRequest>>> {
  const uid = await requireUserId(client);
  if (uid.error) return uid;
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  let q = client
    .from('my_service_requests')
    .select(`${SERVICE_REQUEST_COLUMNS},my_rating`)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (opts.cursor) {
    const [at, id] = opts.cursor.split('|');
    q = q.or(`created_at.lt.${at},and(created_at.eq.${at},id.lt.${id})`);
  }
  const res = fromSupabase<MyServiceRequest[]>(await q);
  return res.error ? res : ok(toPage(res.data ?? [], limit));
}

export type MyQuotePage = { items: MyServiceQuote[]; nextCursor: string | null };

/** Báo giá tôi đã gửi, mới nhất trước. Cursor "<quoted_at>|<quote_id>". */
export async function listMyServiceQuotes(
  client: Client,
  opts: { cursor?: string | null; limit?: number } = {},
): Promise<Result<MyQuotePage>> {
  const uid = await requireUserId(client);
  if (uid.error) return uid;
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  let q = client
    .from('my_service_quotes')
    .select(
      'quote_id,price,available_at,note,quote_status,quoted_at,request_id,trade,title,request_status,site_name,images,customer_id,customer_name,request_created_at,my_rating',
    )
    .order('quoted_at', { ascending: false })
    .order('quote_id', { ascending: false })
    .limit(limit);
  if (opts.cursor) {
    const [at, id] = opts.cursor.split('|');
    q = q.or(`quoted_at.lt.${at},and(quoted_at.eq.${at},quote_id.lt.${id})`);
  }
  const res = fromSupabase<MyServiceQuote[]>(await q);
  if (res.error) return res;
  const items = res.data ?? [];
  const last = items.at(-1);
  return ok({ items, nextCursor: items.length === limit && last ? `${last.quoted_at}|${last.quote_id}` : null });
}

// ── Thao tác (RPC) ───────────────────────────────────────────────────────────────────────────────

/**
 * Thợ gửi / sửa / gửi lại báo giá. Trả quote id. Lỗi: request_closed, cannot_quote_own, blocked, already_quoted,
 * rate_limited (20 / giờ), message_has_phone, message_profanity, banned, invalid_input.
 */
export async function submitQuote(client: Client, input: SubmitQuoteInput): Promise<Result<string>> {
  const parsed = SubmitQuoteInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const v = parsed.data;
  return fromSupabase<string>(
    await client.rpc('submit_quote_tx', {
      p_request_id: v.requestId,
      p_price: v.price,
      p_available_at: v.availableAt ?? undefined,
      p_note: v.note ?? undefined,
    }),
  );
}

/** Thợ rút báo giá đang gửi. Lỗi: not_found, quote_not_pending. */
export async function withdrawQuote(client: Client, input: QuoteIdInput): Promise<Result<null>> {
  const parsed = QuoteIdInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  return voidResult(await client.rpc('withdraw_quote', { p_quote_id: parsed.data.quoteId }));
}

/** Chủ chọn một báo giá → trả conversation id (chat với thợ). Lỗi: forbidden, request_closed, quote_not_pending, blocked. */
export async function acceptQuote(client: Client, input: QuoteIdInput): Promise<Result<string>> {
  const parsed = QuoteIdInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  return fromSupabase<string>(await client.rpc('accept_quote_tx', { p_quote_id: parsed.data.quoteId }));
}

/** Chủ huỷ yêu cầu (open / assigned). Lỗi: not_found, request_closed. */
export async function cancelServiceRequest(client: Client, input: RequestIdInput): Promise<Result<null>> {
  const parsed = RequestIdInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  return voidResult(await client.rpc('cancel_request', { p_request_id: parsed.data.requestId }));
}

/** Chủ xác nhận đã làm xong (assigned → completed). Lỗi: not_found, request_not_assigned. */
export async function completeServiceRequest(client: Client, input: RequestIdInput): Promise<Result<null>> {
  const parsed = RequestIdInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  return voidResult(await client.rpc('complete_request_tx', { p_request_id: parsed.data.requestId }));
}

/** Đánh giá hai chiều sau khi hoàn thành. Lỗi: forbidden, request_not_completed, already_rated, message_*. */
export async function rateServiceRequest(client: Client, input: RateServiceRequestInput): Promise<Result<null>> {
  const parsed = RateServiceRequestInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  return voidResult(
    await client.rpc('rate_service_request', {
      p_request_id: parsed.data.requestId,
      p_score: parsed.data.score,
      p_comment: parsed.data.comment ?? undefined,
    }),
  );
}

/** Mở (hoặc lấy lại) hội thoại chủ ↔ thợ có báo giá. Chủ truyền proId; thợ bỏ trống. Trả conversation id. */
export async function startRequestConversation(client: Client, input: StartRequestConversationInput): Promise<Result<string>> {
  const parsed = StartRequestConversationInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  return fromSupabase<string>(
    await client.rpc('start_request_conversation', {
      p_request_id: parsed.data.requestId,
      p_pro_id: parsed.data.proId ?? undefined,
    }),
  );
}

/** Điểm mình đã chấm yêu cầu này (null = chưa chấm / khách). */
export async function getMyRequestRating(client: Client, requestId: string): Promise<Result<number | null>> {
  const { data: session } = await client.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return ok(null);
  const res = fromSupabase<{ score: number } | null>(
    await client
      .from('ratings')
      .select('score')
      .eq('rater_id', uid)
      .eq('context_type', 'service_request')
      .eq('context_id', requestId)
      .maybeSingle(),
  );
  return res.error ? res : ok(res.data?.score ?? null);
}
