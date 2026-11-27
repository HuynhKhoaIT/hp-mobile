// Hook riêng mobile của mini-app Gọi thợ — chỉ gọi lại @hp/core và thêm phần của app (state bộ lọc, requireAuth, toast,
// haptic, điều hướng, analytics). Không gọi supabase trực tiếp, không khai báo query key. Optimistic + rollback của báo giá /
// rút / huỷ / hoàn thành / chấm điểm nằm trong hook của @hp/core (useSubmitQuote…); ở đây chỉ báo kết quả.
import type { PublicServiceRequest } from '@hp/core';
import {
  type RateServiceRequestVars,
  type SubmitQuoteVars,
  useAcceptQuote,
  useCancelServiceRequest,
  useCompleteServiceRequest,
  useMyQuote,
  useMyRequestRating,
  useRateServiceRequest,
  useServiceRequestList,
  useSession,
  useStartRequestConversation,
  useSubmitQuote,
  useWithdrawQuote,
} from '@hp/core/react';
import { serviceBudget, type ServiceRequestViewerRole, serviceRequestViewerRole, type ServiceTrade } from '@hp/shared';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { track } from '@/core/analytics';
import { requireAuth } from '@/core/auth';
import { openConversation } from '@/features/chat/hooks';
import { useErrorText } from '@/lib/errors';
import { formatMoney } from '@/lib/format';
import { toast } from '@/ui';
import { openNewRequest } from './navigation';

/** Giá trị chip "Tất cả" (không lọc loại thợ). */
export const ALL = '' as const;

/**
 * State màn "Việc quanh bạn": từ khoá (gõ / đã tìm), loại thợ → useServiceRequestList (cursor, staleTime 60s). Danh sách chỉ
 * có yêu cầu đang mở, chưa hết hạn (search_service_requests lọc).
 */
export function useRequestBrowser() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [trade, setTrade] = useState<ServiceTrade | typeof ALL>(ALL);

  const filters = useMemo(() => ({ ...(trade !== ALL ? { trade } : {}), ...(query ? { query } : {}) }), [trade, query]);
  const list = useServiceRequestList(filters);

  return {
    ...list,
    input,
    setInput,
    /** Tìm theo chữ đang gõ (bàn phím "Tìm"). */
    submit: (text: string) => setQuery(text.trim()),
    trade,
    setTrade,
    /** Đang lọc → rỗng là "không có yêu cầu phù hợp", không phải "chưa có yêu cầu". */
    isFiltered: !!query || trade !== ALL,
  };
}

/** Đăng yêu cầu: khách → đăng nhập trước, rồi mở form (chọn sẵn loại thợ nếu có). */
export function useNewRequestAction() {
  return (trade?: ServiceTrade) => requireAuth(() => openNewRequest(trade));
}

/** Chữ ngân sách của yêu cầu ("Từ 100.000 ₫", "100.000 ₫ – 300.000 ₫", "Thoả thuận") — dịch + định dạng theo locale. */
export function useBudgetText() {
  const { t } = useTranslation('tho');
  return (min: number | null | undefined, max: number | null | undefined): string => {
    const b = serviceBudget(min, max);
    switch (b.kind) {
      case 'exact':
        return t('card.budget_exact', { amount: formatMoney(b.amount) });
      case 'range':
        return t('card.budget_range', { min: formatMoney(b.min), max: formatMoney(b.max) });
      case 'from':
        return t('card.budget_from', { min: formatMoney(b.min) });
      case 'upto':
        return t('card.budget_upto', { max: formatMoney(b.max) });
      default:
        return t('card.budget_none');
    }
  };
}

/**
 * Vai trò người xem với yêu cầu (khách / chủ / chưa báo giá / đã báo giá / được chọn / bị từ chối / đã rút) — client chỉ
 * ẩn / hiện nút, server (RLS + RPC) quyết định. `loading`: đang đọc phiên hoặc báo giá của mình.
 */
export function useRequestViewer(request: Pick<PublicServiceRequest, 'id' | 'customer_id'>) {
  const { userId, isLoading: sessionLoading } = useSession();
  const isCustomer = !!userId && userId === request.customer_id;
  const myQuote = useMyQuote(userId && !isCustomer ? request.id : undefined);
  const role: ServiceRequestViewerRole = serviceRequestViewerRole(request, userId, myQuote.data?.status);
  return { userId, role, myQuote: myQuote.data ?? null, loading: sessionLoading || myQuote.isLoading };
}

/**
 * Thao tác với yêu cầu: gửi / sửa / rút báo giá, chọn báo giá, huỷ, xác nhận hoàn thành, mở chat. Khách → đăng nhập rồi
 * làm tiếp (requireAuth). Thành công: haptic nhẹ (gửi báo giá, chọn thợ, hoàn thành) + toast + event analytics.
 */
export function useRequestActions(request: Pick<PublicServiceRequest, 'id' | 'trade'>) {
  const { t } = useTranslation('tho');
  const errorText = useErrorText();
  const submit = useSubmitQuote(request.id);
  const withdraw = useWithdrawQuote(request.id);
  const accept = useAcceptQuote(request.id);
  const cancel = useCancelServiceRequest(request.id);
  const complete = useCompleteServiceRequest(request.id);
  const start = useStartRequestConversation();
  const fail = (e: { code: string }) => toast.show(errorText(e.code), 'danger');
  const light = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  return {
    sendQuote: (vars: SubmitQuoteVars, edited: boolean, onDone: () => void) =>
      requireAuth(() =>
        submit.mutate(vars, {
          onSuccess: () => {
            track('send_quote', { request_id: request.id, trade: request.trade, edited });
            light();
            toast.show(t(edited ? 'quote.updated_toast' : 'quote.sent_toast'), 'success');
            onDone();
          },
          onError: fail,
        }),
      ),
    sending: submit.isPending,
    withdraw: (quoteId: string, onDone: () => void) =>
      withdraw.mutate(
        { quoteId },
        {
          onSuccess: () => {
            toast.show(t('quote.withdrawn_toast'), 'success');
            onDone();
          },
          onError: fail,
        },
      ),
    withdrawing: withdraw.isPending,
    /** Chủ chọn báo giá → vào chat với thợ vừa chọn. */
    accept: (quoteId: string, onDone: () => void) =>
      accept.mutate(
        { quoteId },
        {
          onSuccess: (conversationId) => {
            track('accept_quote', { request_id: request.id, trade: request.trade });
            light();
            toast.show(t('quote.accepted_toast'), 'success');
            onDone();
            openConversation(conversationId);
          },
          onError: fail,
        },
      ),
    accepting: accept.isPending,
    cancel: (onDone: () => void) =>
      cancel.mutate(undefined, {
        onSuccess: () => {
          toast.show(t('actions.cancelled_toast'), 'success');
          onDone();
        },
        onError: fail,
      }),
    cancelling: cancel.isPending,
    complete: (onDone: () => void) =>
      complete.mutate(undefined, {
        onSuccess: () => {
          track('complete_request', { request_id: request.id, trade: request.trade });
          light();
          toast.show(t('actions.completed_toast'), 'success');
          onDone();
        },
        onError: fail,
      }),
    completing: complete.isPending,
    /** Mở chat: chủ truyền `proId` của thợ đã báo giá; thợ bỏ trống. */
    chat: (proId?: string) =>
      requireAuth(() =>
        start.mutate(
          { requestId: request.id, proId: proId ?? null },
          { onSuccess: (conversationId) => openConversation(conversationId), onError: fail },
        ),
      ),
    openingChat: start.isPending,
  };
}

/** Đánh giá người còn lại sau khi yêu cầu hoàn thành (chủ chấm thợ, thợ chấm chủ). Điểm đã chấm: `rated` (null = chưa). */
export function useRequestRating(requestId: string, enabled: boolean) {
  const { t } = useTranslation('tho');
  const errorText = useErrorText();
  const mine = useMyRequestRating(requestId, enabled);
  const rate = useRateServiceRequest(requestId);
  return {
    rated: mine.data ?? null,
    loading: mine.isLoading,
    pending: rate.isPending,
    submit: (score: number, comment: string, onDone: () => void) => {
      const vars: RateServiceRequestVars = { score, comment: comment.trim() || null };
      rate.mutate(vars, {
        onSuccess: () => {
          track('rate_request', { request_id: requestId, score });
          toast.show(t('rate.thanks'), 'success');
          onDone();
        },
        onError: (e) => toast.show(errorText(e.code), 'danger'),
      });
    },
  };
}
