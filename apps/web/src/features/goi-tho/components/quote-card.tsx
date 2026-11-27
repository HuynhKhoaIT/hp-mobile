'use client';

// Một báo giá của thợ trong chi tiết yêu cầu (chủ xem danh sách để chọn; thợ xem báo giá của mình): avatar + tên "An N." +
// điểm uy tín (sao + số lượt, kèm chữ) → giá (đậm, primary) + nhãn "Giá tốt nhất" → có thể làm lúc → ghi chú → nhãn trạng thái →
// nút "Chọn thợ này" (chủ, yêu cầu còn mở, báo giá đang chờ) + "Nhắn tin". Không SĐT, không nút gọi điện. Khớp QuoteCard của app.
import type { RequestQuote } from '@hp/core';
import { formatDate, formatMoney, serviceQuoteDisplayStatus } from '@hp/shared';
import { MessageCircle, Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/shared/badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { asLocale } from '@/features/listing/display';
import { cn } from '@/lib/utils';
import { QuoteStatusBadge } from './request-status-badge';

export function QuoteCard({
  quote,
  lowest = false,
  onAccept,
  accepting = false,
  onChat,
}: {
  quote: RequestQuote;
  /** Giá thấp nhất trong các báo giá còn hiệu lực. */
  lowest?: boolean;
  /** Chủ yêu cầu, yêu cầu còn mở, báo giá đang chờ → hiện "Chọn thợ này". */
  onAccept?: () => void;
  accepting?: boolean;
  /** Mở chat với thợ này (chủ: trước hoặc sau khi chọn). */
  onChat?: () => void;
}) {
  const t = useTranslations('tho');
  const locale = asLocale(useLocale());
  const status = serviceQuoteDisplayStatus(quote.status);
  const name = quote.pro_name || '…';
  const rated = quote.pro_rating_count > 0;

  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-surface p-4 shadow-card',
        status === 'accepted' ? 'border-2 border-primary' : 'border-border',
      )}
    >
      <div className="flex items-center gap-3">
        <UserAvatar avatar={quote.pro_avatar_url} name={name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-md font-semibold text-fg">{name}</span>
          {rated ? (
            <span className="flex items-center gap-1 text-sm text-muted" aria-label={`${quote.pro_rating_avg}/5, ${quote.pro_rating_count}`}>
              <Star strokeWidth={1.75} className="size-3.5 fill-warning text-warning" aria-hidden />
              {`${Number(quote.pro_rating_avg).toFixed(1)} (${quote.pro_rating_count})`}
            </span>
          ) : null}
        </div>
        <QuoteStatusBadge status={status} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xl font-bold text-primary">{formatMoney(quote.price, locale)}</span>
        {lowest ? <Badge tone="success">{t('detail.best_price')}</Badge> : null}
      </div>
      {quote.available_at ? <p className="text-sm text-muted">{t('quote.available', { time: formatDate(quote.available_at, locale, 'datetime') })}</p> : null}
      {quote.note ? <p className="text-md break-words text-fg">{quote.note}</p> : null}
      {onAccept || onChat ? (
        <div className="flex flex-wrap gap-2">
          {onAccept ? (
            <Button type="button" className="flex-1" disabled={accepting} aria-busy={accepting || undefined} onClick={onAccept}>
              {t('quote.accept')}
            </Button>
          ) : null}
          {onChat ? (
            <Button type="button" variant="outline" className={onAccept ? undefined : 'flex-1'} onClick={onChat}>
              <MessageCircle strokeWidth={1.75} aria-hidden />
              {t('actions.chat')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
