// Hook Gọi thợ (migration 20261128090000_service_requests). Optimistic + rollback cho báo giá / rút / huỷ / hoàn thành /
// đánh giá (.claude/rules/be-shared-packages.md): nhãn trạng thái, báo giá của mình đổi ngay; lỗi → trả lại + client
// hiện t('errors.<code>'). Mọi mutation làm mới nhánh keys.serviceRequests() (danh sách, chi tiết, của tôi) + hộp thư.
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CreateServiceRequestInput,
  QuoteIdInput,
  RateServiceRequestInput,
  RequestIdInput,
  StartRequestConversationInput,
  SubmitQuoteInput,
  UpdateServiceRequestInput,
} from '@hp/shared';
import { keys } from '../keys';
import type { AppError } from '../result';
import {
  acceptQuote,
  cancelServiceRequest,
  completeServiceRequest,
  createServiceRequest,
  getMyQuote,
  getMyRequestRating,
  getServiceRequest,
  getServiceRequestPrivate,
  listMyServiceQuotes,
  listMyServiceRequests,
  listRequestQuotes,
  type MyQuoteForRequest,
  type MyQuotePage,
  type MyServiceQuote,
  type MyServiceRequest,
  type PublicServiceRequest,
  rateServiceRequest,
  type RequestQuote,
  type SavedServiceRequest,
  searchServiceRequests,
  type ServiceRequestPage,
  type ServiceRequestPrivate,
  type ServiceRequestQuery,
  startRequestConversation,
  submitQuote,
  updateServiceRequest,
  uploadRequestImage,
  withdrawQuote,
} from '../service-requests';
import { unwrap, useSession } from './hooks';
import { useSupabase } from './provider';

type RequestPages = InfiniteData<ServiceRequestPage, string | null>;

/** Yêu cầu đổi → làm mới danh sách, chi tiết (cả báo giá + địa chỉ + điểm đã chấm), của tôi, hộp thư (chat mới / chat đóng). */
function invalidateRequest(qc: QueryClient, id?: string) {
  void qc.invalidateQueries({ queryKey: keys.serviceRequests() });
  if (id) void qc.invalidateQueries({ queryKey: keys.serviceRequest(id) });
  void qc.invalidateQueries({ queryKey: keys.conversations() });
}

type Paged = { pages: { items: { id?: string; request_id?: string }[] }[] };
const isPaged = (data: unknown): data is Paged => !!data && typeof data === 'object' && Array.isArray((data as Paged).pages);

/** Sửa yêu cầu trong chi tiết + mọi trang danh sách (công khai, của tôi) và dòng báo giá của tôi cùng yêu cầu. */
function patchRequestCaches(
  qc: QueryClient,
  id: string,
  patch: { request?: (r: PublicServiceRequest) => PublicServiceRequest; quoteRow?: (q: MyServiceQuote) => MyServiceQuote },
) {
  if (patch.request) {
    const fn = patch.request;
    qc.setQueryData<PublicServiceRequest>(keys.serviceRequest(id), (r) => (r ? fn(r) : r));
  }
  qc.setQueriesData({ queryKey: keys.serviceRequests() }, (data: unknown) => {
    if (!isPaged(data)) return data;
    return {
      ...(data as object),
      pages: data.pages.map((p) => ({
        ...p,
        items: p.items.map((item) => {
          if (patch.request && (item as { id?: string }).id === id) return patch.request(item as unknown as PublicServiceRequest);
          if (patch.quoteRow && (item as { request_id?: string }).request_id === id) return patch.quoteRow(item as unknown as MyServiceQuote);
          return item;
        }),
      })),
    };
  });
}

type Snapshot = { entries: [readonly unknown[], unknown][] };

async function snapshot(qc: QueryClient): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: keys.serviceRequests() });
  return { entries: qc.getQueriesData({ queryKey: keys.serviceRequests() }) };
}

function restore(qc: QueryClient, s: Snapshot | undefined) {
  if (!s) return;
  for (const [key, data] of s.entries) qc.setQueryData(key, data);
}

// ── Đọc ───────────────────────────────────────────────────────────────────────────
/** Yêu cầu đang mở (cursor); filters = trade / urgency / site / query / lat / lng / radiusM. */
export function useServiceRequestList(query: Omit<ServiceRequestQuery, 'cursor'> = {}, opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const result = useInfiniteQuery<ServiceRequestPage, AppError, RequestPages, readonly unknown[], string | null>({
    queryKey: keys.serviceRequests(query),
    queryFn: ({ pageParam }) => unwrap(searchServiceRequests(client, { ...query, cursor: pageParam })),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 60_000,
    enabled: opts.enabled ?? true,
  });
  return { ...result, items: result.data?.pages.flatMap((p) => p.items) ?? [] };
}

/** Tìm yêu cầu trong cache danh sách để mở chi tiết không chớp skeleton. */
function findCachedRequest(qc: QueryClient, id: string): PublicServiceRequest | undefined {
  for (const [, data] of qc.getQueriesData({ queryKey: keys.serviceRequests() })) {
    if (!isPaged(data)) continue;
    const hit = data.pages.flatMap((p) => p.items).find((r) => r.id === id);
    if (hit) return hit as unknown as PublicServiceRequest;
  }
  return undefined;
}

export function useServiceRequest(id: string | undefined) {
  const client = useSupabase();
  const qc = useQueryClient();
  return useQuery<PublicServiceRequest, AppError>({
    queryKey: keys.serviceRequest(id ?? ''),
    queryFn: () => unwrap(getServiceRequest(client, id ?? '')),
    enabled: !!id,
    staleTime: 30_000,
    placeholderData: () => (id ? findCachedRequest(qc, id) : undefined),
  });
}

/** Báo giá của yêu cầu theo quyền xem (chủ thấy hết, thợ chỉ thấy của mình). Khách không gọi. */
export function useRequestQuotes(requestId: string | undefined, opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const { userId } = useSession();
  return useQuery<RequestQuote[], AppError>({
    queryKey: keys.requestQuotes(requestId ?? ''),
    queryFn: () => unwrap(listRequestQuotes(client, requestId ?? '')),
    enabled: !!requestId && !!userId && (opts.enabled ?? true),
    staleTime: 15_000,
  });
}

/** Báo giá của mình cho yêu cầu (null = chưa báo giá; khách luôn null, không gọi server). */
export function useMyQuote(requestId: string | undefined) {
  const client = useSupabase();
  const { userId } = useSession();
  return useQuery<MyQuoteForRequest | null, AppError>({
    queryKey: keys.myRequestQuote(requestId ?? '', userId ?? ''),
    queryFn: () => unwrap(getMyQuote(client, requestId ?? '')),
    enabled: !!requestId && !!userId,
    staleTime: 30_000,
  });
}

/** Địa chỉ + toạ độ chính xác (chủ / thợ được chọn). null = chưa có quyền. */
export function useRequestPrivate(requestId: string | undefined, enabled = true) {
  const client = useSupabase();
  const { userId } = useSession();
  return useQuery<ServiceRequestPrivate | null, AppError>({
    queryKey: keys.requestPrivate(requestId ?? '', userId ?? ''),
    queryFn: () => unwrap(getServiceRequestPrivate(client, requestId ?? '')),
    enabled: !!requestId && !!userId && enabled,
    staleTime: 60_000,
  });
}

/** Điểm mình đã chấm yêu cầu (null = chưa chấm). */
export function useMyRequestRating(requestId: string | undefined, enabled = true) {
  const client = useSupabase();
  const { userId } = useSession();
  return useQuery<number | null, AppError>({
    queryKey: keys.myRequestRating(requestId ?? '', userId ?? ''),
    queryFn: () => unwrap(getMyRequestRating(client, requestId ?? '')),
    enabled: !!requestId && !!userId && enabled,
    staleTime: 60_000,
  });
}

/** Yêu cầu tôi đăng (cursor, mọi trạng thái). */
export function useMyServiceRequests(opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const { userId } = useSession();
  const result = useInfiniteQuery<
    ServiceRequestPage<MyServiceRequest>,
    AppError,
    InfiniteData<ServiceRequestPage<MyServiceRequest>, string | null>,
    readonly unknown[],
    string | null
  >({
    queryKey: keys.myServiceRequests(),
    queryFn: ({ pageParam }) => unwrap(listMyServiceRequests(client, { cursor: pageParam })),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!userId && (opts.enabled ?? true),
    staleTime: 30_000,
  });
  return { ...result, items: result.data?.pages.flatMap((p) => p.items) ?? [] };
}

/** Báo giá tôi đã gửi (cursor). */
export function useMyServiceQuotes(opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const { userId } = useSession();
  const result = useInfiniteQuery<MyQuotePage, AppError, InfiniteData<MyQuotePage, string | null>, readonly unknown[], string | null>({
    queryKey: keys.myServiceQuotes(),
    queryFn: ({ pageParam }) => unwrap(listMyServiceQuotes(client, { cursor: pageParam })),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!userId && (opts.enabled ?? true),
    staleTime: 30_000,
  });
  return { ...result, items: result.data?.pages.flatMap((p) => p.items) ?? [] };
}

// ── Chủ yêu cầu ───────────────────────────────────────────────────────────────────
export function useCreateServiceRequest() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<SavedServiceRequest, AppError, CreateServiceRequestInput>({
    mutationFn: (input) => unwrap(createServiceRequest(client, input)),
    onSuccess: (r) => invalidateRequest(qc, r.id),
  });
}

export function useUpdateServiceRequest() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<SavedServiceRequest, AppError, UpdateServiceRequestInput>({
    mutationFn: (input) => unwrap(updateServiceRequest(client, input)),
    onSettled: (_d, _e, input) => invalidateRequest(qc, input.id),
  });
}

/** Upload ảnh yêu cầu (đã nén) vào request-images; retry 2 lần. */
export function useUploadRequestImage() {
  const client = useSupabase();
  return useMutation<
    string,
    AppError,
    { userId: string; requestId: string; index: number; body: ArrayBuffer | Blob; contentType: 'image/webp' | 'image/jpeg' }
  >({
    mutationFn: (input) => unwrap(uploadRequestImage(client, input)),
    retry: 2,
  });
}

/** Huỷ yêu cầu: nhãn "Đã huỷ" hiện ngay, lỗi → trả lại. */
export function useCancelServiceRequest(requestId: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<null, AppError, void, Snapshot>({
    mutationFn: () => unwrap(cancelServiceRequest(client, { requestId } satisfies RequestIdInput)),
    onMutate: async () => {
      const s = await snapshot(qc);
      patchRequestCaches(qc, requestId, { request: (r) => ({ ...r, status: 'cancelled' }) });
      return s;
    },
    onError: (_e, _v, s) => restore(qc, s),
    onSettled: () => invalidateRequest(qc, requestId),
  });
}

/** Xác nhận hoàn thành: nhãn "Hoàn thành" hiện ngay (mở nút đánh giá), lỗi → trả lại. */
export function useCompleteServiceRequest(requestId: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<null, AppError, void, Snapshot>({
    mutationFn: () => unwrap(completeServiceRequest(client, { requestId } satisfies RequestIdInput)),
    onMutate: async () => {
      const s = await snapshot(qc);
      patchRequestCaches(qc, requestId, { request: (r) => ({ ...r, status: 'completed', completed_at: new Date().toISOString() }) });
      return s;
    },
    onError: (_e, _v, s) => restore(qc, s),
    onSettled: () => invalidateRequest(qc, requestId),
  });
}

/**
 * Chọn một báo giá → trả conversation id. Không optimistic (kết quả kèm chat + từ chối báo giá khác do server quyết):
 * thành công thì trạng thái "Đã chọn thợ" hiện ngay rồi làm mới.
 */
export function useAcceptQuote(requestId: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<string, AppError, QuoteIdInput>({
    mutationFn: (input) => unwrap(acceptQuote(client, input)),
    onSuccess: (_conversationId, v) => {
      patchRequestCaches(qc, requestId, { request: (r) => ({ ...r, status: 'assigned' }) });
      qc.setQueryData<RequestQuote[]>(keys.requestQuotes(requestId), (list) =>
        list?.map((q) => (q.id === v.quoteId ? { ...q, status: 'accepted' } : q.status === 'submitted' ? { ...q, status: 'declined' } : q)),
      );
    },
    onSettled: () => invalidateRequest(qc, requestId),
  });
}

// ── Thợ ───────────────────────────────────────────────────────────────────────────
export type SubmitQuoteVars = Omit<SubmitQuoteInput, 'requestId'>;

/**
 * Gửi / sửa / gửi lại báo giá. Optimistic: báo giá của mình hiện ngay (status submitted), số báo giá +1 khi là báo giá mới
 * hoặc gửi lại sau khi rút. Lỗi → trả lại.
 */
export function useSubmitQuote(requestId: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  const { userId } = useSession();
  const myKey = keys.myRequestQuote(requestId, userId ?? '');
  return useMutation<string, AppError, SubmitQuoteVars, Snapshot & { mine?: MyQuoteForRequest | null }>({
    mutationFn: (v) => unwrap(submitQuote(client, { ...v, requestId })),
    onMutate: async (v) => {
      const s = await snapshot(qc);
      const mine = qc.getQueryData<MyQuoteForRequest | null>(myKey);
      const next: MyQuoteForRequest = {
        id: mine?.id ?? 'pending',
        price: v.price,
        available_at: v.availableAt ?? null,
        note: v.note ?? null,
        status: 'submitted',
      };
      qc.setQueryData<MyQuoteForRequest | null>(myKey, next);
      if (!mine || mine.status === 'withdrawn') {
        patchRequestCaches(qc, requestId, { request: (r) => ({ ...r, quotes_count: r.quotes_count + 1 }) });
      }
      return { ...s, mine };
    },
    onError: (_e, _v, ctx) => {
      restore(qc, ctx);
      if (ctx) qc.setQueryData(myKey, ctx.mine);
    },
    onSettled: () => {
      invalidateRequest(qc, requestId);
      void qc.invalidateQueries({ queryKey: myKey });
    },
  });
}

/** Rút báo giá đang gửi: nhãn "Đã rút" hiện ngay, số báo giá -1, lỗi → trả lại. */
export function useWithdrawQuote(requestId: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  const { userId } = useSession();
  const myKey = keys.myRequestQuote(requestId, userId ?? '');
  return useMutation<null, AppError, QuoteIdInput, Snapshot & { mine?: MyQuoteForRequest | null }>({
    mutationFn: (input) => unwrap(withdrawQuote(client, input)),
    onMutate: async () => {
      const s = await snapshot(qc);
      const mine = qc.getQueryData<MyQuoteForRequest | null>(myKey);
      if (mine) {
        const next: MyQuoteForRequest = { ...mine, status: 'withdrawn' };
        qc.setQueryData<MyQuoteForRequest | null>(myKey, next);
      }
      patchRequestCaches(qc, requestId, {
        request: (r) => ({ ...r, quotes_count: Math.max(0, r.quotes_count - 1) }),
        quoteRow: (q) => ({ ...q, quote_status: 'withdrawn' }),
      });
      return { ...s, mine };
    },
    onError: (_e, _v, ctx) => {
      restore(qc, ctx);
      if (ctx) qc.setQueryData(myKey, ctx.mine);
    },
    onSettled: () => {
      invalidateRequest(qc, requestId);
      void qc.invalidateQueries({ queryKey: myKey });
    },
  });
}

// ── Đánh giá + chat ───────────────────────────────────────────────────────────────
export type RateServiceRequestVars = Omit<RateServiceRequestInput, 'requestId'>;

/** Chấm người còn lại sau khi hoàn thành: điểm hiện ngay, lỗi → trả lại. */
export function useRateServiceRequest(requestId: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  const { userId } = useSession();
  const ratingKey = keys.myRequestRating(requestId, userId ?? '');
  return useMutation<null, AppError, RateServiceRequestVars, { previous: number | null | undefined }>({
    mutationFn: (v) => unwrap(rateServiceRequest(client, { ...v, requestId })),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ratingKey });
      const previous = qc.getQueryData<number | null>(ratingKey);
      qc.setQueryData<number | null>(ratingKey, v.score);
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(ratingKey, ctx?.previous),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ratingKey });
      invalidateRequest(qc, requestId);
    },
  });
}

/** Mở chat chủ ↔ thợ có báo giá → trả conversation id. */
export function useStartRequestConversation() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<string, AppError, StartRequestConversationInput>({
    mutationFn: (input) => unwrap(startRequestConversation(client, input)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.conversations() }),
  });
}
