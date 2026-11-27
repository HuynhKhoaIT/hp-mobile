'use client';

// "Của tôi" (cần đăng nhập — proxy.ts; noindex): hai tab — "Yêu cầu của tôi" (mọi trạng thái, kèm số báo giá, useMyServiceRequests) và
// "Báo giá của tôi" (thợ: giá + trạng thái báo giá + trạng thái yêu cầu, useMyServiceQuotes). Thẻ → chi tiết yêu cầu.
// Skeleton đúng hình thẻ → rỗng có CTA → lỗi có Thử lại; "Xem thêm" theo cursor. Khớp tab mine / quotes của app.
import type { MyServiceQuote } from '@hp/core';
import { useMyServiceQuotes, useMyServiceRequests, useSession } from '@hp/core/react';
import { formatMoney, formatRelative, serviceQuoteDisplayStatus } from '@hp/shared';
import { tradeArtKey } from '@hp/tokens/category-art';
import { ClipboardList, MessageSquareQuote } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { CategoryArt } from '@/components/shared/category-art';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { SignInPrompt } from '@/components/shared/sign-in-prompt';
import { Button } from '@/components/ui/button';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import { GOI_THO_PATHS } from '../trades';
import { RequestCard, RequestCardSkeleton } from './request-card';
import { QuoteStatusBadge, RequestStatusBadge } from './request-status-badge';

type Tab = 'requests' | 'quotes';

const GRID = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3';

export function MyView() {
  const t = useTranslations('tho');
  const session = useSession();
  const [tab, setTab] = useState<Tab>('requests');

  if (!session.isLoading && !session.userId) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <SignInPrompt />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:py-6">
      <div role="group" aria-label={t('mine.title')} className="flex gap-2">
        <ChoiceChip selected={tab === 'requests'} onClick={() => setTab('requests')}>
          {t('mine.tab_requests')}
        </ChoiceChip>
        <ChoiceChip selected={tab === 'quotes'} onClick={() => setTab('quotes')}>
          {t('mine.tab_quotes')}
        </ChoiceChip>
      </div>
      {tab === 'requests' ? <MyRequests /> : <MyQuotes />}
    </div>
  );
}

function Skeletons() {
  return (
    <ul className={GRID}>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i}>
          <RequestCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

function MyRequests() {
  const t = useTranslations('tho');
  const mine = useMyServiceRequests();
  if (mine.isLoading) return <Skeletons />;
  if (mine.isError && mine.items.length === 0) return <ErrorState code={mine.error.code} onRetry={() => void mine.refetch()} />;
  if (mine.items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={t('mine.empty_requests_title')}
        description={t('mine.empty_requests_body')}
        action={
          <Button asChild>
            <Link href={GOI_THO_PATHS.post}>{t('list.empty_cta')}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      <ul className={GRID}>
        {mine.items.map((r) => (
          <li key={r.id}>
            <RequestCard request={r} />
          </li>
        ))}
      </ul>
      {mine.hasNextPage ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" disabled={mine.isFetchingNextPage} onClick={() => void mine.fetchNextPage()}>
            {t('list.load_more')}
          </Button>
        </div>
      ) : null}
    </>
  );
}

function MyQuotes() {
  const t = useTranslations('tho');
  const quotes = useMyServiceQuotes();
  if (quotes.isLoading) return <Skeletons />;
  if (quotes.isError && quotes.items.length === 0) return <ErrorState code={quotes.error.code} onRetry={() => void quotes.refetch()} />;
  if (quotes.items.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareQuote}
        title={t('mine.empty_quotes_title')}
        description={t('mine.empty_quotes_body')}
        action={
          <Button asChild>
            <Link href={GOI_THO_PATHS.home}>{t('mine.empty_quotes_cta')}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      <ul className={GRID}>
        {quotes.items.map((q) => (
          <li key={q.quote_id}>
            <MyQuoteCard quote={q} />
          </li>
        ))}
      </ul>
      {quotes.hasNextPage ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" disabled={quotes.isFetchingNextPage} onClick={() => void quotes.fetchNextPage()}>
            {t('list.load_more')}
          </Button>
        </div>
      ) : null}
    </>
  );
}

/** Thẻ "Báo giá của tôi" (thợ): loại thợ + tiêu đề → nhãn báo giá + trạng thái yêu cầu → giá mình báo → người cần thợ · khu. */
function MyQuoteCard({ quote }: { quote: MyServiceQuote }) {
  const t = useTranslations('tho');
  const locale = asLocale(useLocale());
  const meta = [quote.customer_name, quote.site_name, formatRelative(quote.quoted_at, locale)].filter(Boolean).join(' · ');
  return (
    <Link
      href={GOI_THO_PATHS.request(quote.request_id)}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card outline-none transition hover:-translate-y-0.5 hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:hover:translate-y-0"
    >
      <span className="flex items-start gap-3">
        <CategoryArt category={tradeArtKey(quote.trade)} className="size-12" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm text-muted">{t(`trade.${quote.trade}`)}</span>
          <span className="line-clamp-2 text-lg font-semibold text-fg">{quote.title}</span>
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-1">
        <QuoteStatusBadge status={serviceQuoteDisplayStatus(quote.quote_status)} />
        <RequestStatusBadge status={quote.request_status} />
      </span>
      <span className="text-2xl font-bold text-primary">{formatMoney(quote.price, locale)}</span>
      {meta ? <span className="truncate text-sm text-muted">{meta}</span> : null}
    </Link>
  );
}
