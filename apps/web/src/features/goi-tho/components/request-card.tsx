'use client';

// Thẻ yêu cầu gọi thợ (danh sách "Việc quanh bạn", "Của tôi") — cùng ngôn ngữ card với group-card / listing-card:
// (1) ô icon loại thợ (nền soft màu Gọi thợ) + tên loại + tiêu đề tối đa 2 dòng → (2) nhãn trạng thái + mức khẩn →
// (3) ngân sách (đậm, primary) | số báo giá → (4) khu · đăng cách đây bao lâu. Cả thẻ là một link tới chi tiết.
// Khớp app (apps/mobile/src/features/tho/components/RequestCard.tsx): đổi một bên → đổi bên kia.
import type { PublicServiceRequest } from '@hp/core';
import { formatRelative, serviceRequestDisplayStatus } from '@hp/shared';
import { MessageSquareQuote } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Badge } from '@/components/shared/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import { TRADE_ICON, GOI_THO_PATHS } from '../trades';
import { useBudgetText } from '../use-goi-tho';
import { RequestStatusBadge } from './request-status-badge';

type CardRequest = Pick<
  PublicServiceRequest,
  'id' | 'trade' | 'title' | 'status' | 'expires_at' | 'budget_min' | 'budget_max' | 'quotes_count' | 'site_name' | 'created_at' | 'urgency'
>;

export function RequestCard({ request, extra }: { request: CardRequest; /** Nhãn phụ cạnh trạng thái (Của tôi: "Báo giá của bạn"). */ extra?: ReactNode }) {
  const t = useTranslations('tho');
  const locale = asLocale(useLocale());
  const budget = useBudgetText();
  const status = serviceRequestDisplayStatus(request);
  const TradeIcon = TRADE_ICON[request.trade];
  const quotes = request.quotes_count > 0 ? t('card.quotes_count', { count: request.quotes_count }) : t('card.no_quotes');
  const meta = [request.site_name, formatRelative(request.created_at, locale)].filter(Boolean).join(' · ');

  return (
    <Link
      href={GOI_THO_PATHS.request(request.id)}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card outline-none transition hover:-translate-y-0.5 hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:hover:translate-y-0"
    >
      <span className="flex items-start gap-3">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-md border border-service-goi-tho/20 bg-service-goi-tho-soft">
          <TradeIcon strokeWidth={1.75} className="size-6 text-service-goi-tho" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm text-muted">{t(`trade.${request.trade}`)}</span>
          <span className="line-clamp-2 text-lg font-semibold text-fg">{request.title}</span>
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-1">
        <RequestStatusBadge status={status} />
        <Badge>{t(`urgency.${request.urgency}`)}</Badge>
        {extra}
      </span>
      <span className="flex items-center justify-between gap-3">
        <span className="flex-1 text-md font-bold text-primary">{budget(request.budget_min, request.budget_max)}</span>
        <span className="flex items-center gap-1 text-sm text-muted">
          <MessageSquareQuote strokeWidth={1.75} className="size-4" aria-hidden />
          {quotes}
        </span>
      </span>
      {meta ? <span className="truncate text-sm text-muted">{meta}</span> : null}
    </Link>
  );
}

/** Khung chờ đúng hình RequestCard. */
export function RequestCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex gap-3">
        <Skeleton className="size-12 rounded-md" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      </div>
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}
