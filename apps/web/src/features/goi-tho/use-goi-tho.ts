'use client';

// Hook riêng web của mini-app Gọi thợ — chỉ gọi lại @hp/core/react và thêm phần của web (toast, điều hướng). Optimistic +
// rollback của báo giá / rút / huỷ / hoàn thành / chấm điểm nằm trong hook của @hp/core (useSubmitQuote…); ở đây chỉ báo
// kết quả. Cùng luật với app (apps/mobile/src/features/tho/hooks.ts): vai trò + hành động lấy từ @hp/shared.
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
  useSession,
  useStartRequestConversation,
  useSubmitQuote,
  useWithdrawQuote,
} from '@hp/core/react';
import { formatMoney, serviceBudget, type ServiceRequestViewerRole, serviceRequestViewerRole } from '@hp/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useToast } from '@/components/shared/toast';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { asLocale } from '@/features/listing/display';
import { useRouter } from '@/i18n/navigation';
import { GOI_THO_PATHS } from './trades';

/** Chữ ngân sách của yêu cầu ("Từ 100.000 ₫", "100.000 ₫ – 300.000 ₫", "Thoả thuận") — dịch + định dạng theo locale. */
export function useBudgetText() {
  const t = useTranslations('tho');
  const locale = asLocale(useLocale());
  return (min: number | null | undefined, max: number | null | undefined): string => {
    const b = serviceBudget(min, max);
    switch (b.kind) {
      case 'exact':
        return t('card.budget_exact', { amount: formatMoney(b.amount, locale) });
      case 'range':
        return t('card.budget_range', { min: formatMoney(b.min, locale), max: formatMoney(b.max, locale) });
      case 'from':
        return t('card.budget_from', { min: formatMoney(b.min, locale) });
      case 'upto':
        return t('card.budget_upto', { max: formatMoney(b.max, locale) });
      default:
        return t('card.budget_none');
    }
  };
}

/**
 * Vai trò người xem với yêu cầu (khách / chủ / chưa báo giá / đã báo giá / được chọn / bị từ chối / đã rút) — client chỉ ẩn /
 * hiện nút, server (RLS + RPC) quyết định. `loading`: đang đọc phiên hoặc báo giá của mình.
 */
export function useRequestViewer(request: Pick<PublicServiceRequest, 'id' | 'customer_id'>) {
  const { userId, isLoading: sessionLoading } = useSession();
  const isCustomer = !!userId && userId === request.customer_id;
  const myQuote = useMyQuote(userId && !isCustomer ? request.id : undefined);
  const role: ServiceRequestViewerRole = serviceRequestViewerRole(request, userId, myQuote.data?.status);
  return { userId, role, myQuote: myQuote.data ?? null, loading: sessionLoading || myQuote.isLoading };
}

/**
 * Thao tác với yêu cầu: gửi / sửa / rút báo giá, chọn báo giá, huỷ, xác nhận hoàn thành, mở chat. Lỗi server → toast
 * errors.<code>; chọn thợ / mở chat → vào khung chat trong mini-app (/goi-tho/tin-nhan/[id]).
 */
export function useRequestActions(request: Pick<PublicServiceRequest, 'id'>) {
  const t = useTranslations('tho');
  const errorText = useErrorText();
  const toast = useToast();
  const router = useRouter();
  const submit = useSubmitQuote(request.id);
  const withdraw = useWithdrawQuote(request.id);
  const accept = useAcceptQuote(request.id);
  const cancel = useCancelServiceRequest(request.id);
  const complete = useCompleteServiceRequest(request.id);
  const start = useStartRequestConversation();
  const fail = (e: { code: string }) => toast.show(errorText(e.code), 'error');

  return {
    sendQuote: (vars: SubmitQuoteVars, edited: boolean, onDone: () => void) =>
      submit.mutate(vars, {
        onSuccess: () => {
          toast.show(t(edited ? 'quote.updated_toast' : 'quote.sent_toast'));
          onDone();
        },
        onError: fail,
      }),
    sending: submit.isPending,
    sendError: submit.error?.code ?? null,
    withdraw: (quoteId: string, onDone: () => void) =>
      withdraw.mutate(
        { quoteId },
        {
          onSuccess: () => {
            toast.show(t('quote.withdrawn_toast'));
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
            toast.show(t('quote.accepted_toast'));
            onDone();
            router.push(GOI_THO_PATHS.thread(conversationId));
          },
          onError: fail,
        },
      ),
    accepting: accept.isPending,
    cancel: (onDone: () => void) =>
      cancel.mutate(undefined, {
        onSuccess: () => {
          toast.show(t('actions.cancelled_toast'));
          onDone();
        },
        onError: fail,
      }),
    cancelling: cancel.isPending,
    complete: (onDone: () => void) =>
      complete.mutate(undefined, {
        onSuccess: () => {
          toast.show(t('actions.completed_toast'));
          onDone();
        },
        onError: fail,
      }),
    completing: complete.isPending,
    /** Mở chat: chủ truyền `proId` của thợ đã báo giá; thợ bỏ trống. */
    chat: (proId?: string) =>
      start.mutate(
        { requestId: request.id, proId: proId ?? null },
        { onSuccess: (conversationId) => router.push(GOI_THO_PATHS.thread(conversationId)), onError: fail },
      ),
    openingChat: start.isPending,
  };
}

/** Đánh giá người còn lại sau khi yêu cầu hoàn thành (chủ chấm thợ, thợ chấm chủ). `rated`: điểm đã chấm (null = chưa). */
export function useRequestRating(requestId: string, enabled: boolean) {
  const t = useTranslations('tho');
  const mine = useMyRequestRating(requestId, enabled);
  const rate = useRateServiceRequest(requestId);
  const toast = useToast();
  return {
    rated: mine.data ?? null,
    loading: mine.isLoading,
    pending: rate.isPending,
    submit: (score: number, comment: string, handlers: { onDone: () => void; onError: (code: string) => void }) => {
      const vars: RateServiceRequestVars = { score, comment: comment.trim() || null };
      rate.mutate(vars, {
        onSuccess: () => {
          toast.show(t('rate.thanks'));
          handlers.onDone();
        },
        onError: (e) => handlers.onError(e.code),
      });
    },
  };
}
