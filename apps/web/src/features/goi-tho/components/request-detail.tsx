'use client';

// Chi tiết yêu cầu gọi thợ (`/goi-tho/yeu-cau/[id]`, thông báo quote_* / request_*). Dữ liệu ở trình duyệt qua hook
// @hp/core/react (RLS theo người xem; trang riêng tư theo đăng nhập nên noindex). Một bố cục, đổi theo vai trò người xem
// (serviceRequestViewerRole + serviceRequestActions của @hp/shared — cùng luật với app):
//   cột trái: thẻ tóm tắt (loại thợ + trạng thái + mức khẩn, tiêu đề, ngân sách, đăng / hết hạn, khu) → banner đã huỷ / hết hạn →
//     ảnh → mô tả → "Địa chỉ làm việc" (chính xác chỉ chủ + thợ được chọn — useRequestPrivate / RLS; người khác: dòng giải
//     thích + khu gần đúng) → chủ: "Báo giá (N)" (QuoteCard + "Chọn thợ này" có xác nhận + "Nhắn tin"); thợ đã báo giá:
//     "Báo giá của bạn" → người cần thợ (khi người xem không phải chủ) → mẹo làm việc an toàn
//   cột phải (dính từ 1024px; dưới 1024px nằm dưới nội dung): hành động theo vai trò — khách "Đăng nhập để báo giá" (LoginDialog),
//     chưa báo giá "Báo giá", đã báo giá "Sửa / Rút / Nhắn tin", thợ được chọn "Nhắn tin / Đánh giá", chủ "Sửa / Huỷ /
//     Đã làm xong / Nhắn tin / Đánh giá" + "Báo cáo yêu cầu" (người xem không phải chủ). Hành động khó hoàn tác xác nhận bằng ConfirmDialog.
// Chưa có bản đồ (chờ key Goong): chỉ chữ địa chỉ. Không có nút gọi điện.
import type { PublicServiceRequest, RequestQuote } from '@hp/core';
import { useRequestPrivate, useRequestQuotes, useServiceRequest, useSession } from '@hp/core/react';
import {
  formatDate,
  formatRelative,
  lowestQuoteId,
  type ServiceRequestAction,
  serviceRequestActions,
  serviceRequestDisplayStatus,
} from '@hp/shared';
import { CircleCheck, Clock, MapPin, MessageCircle, SearchX, Star } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Badge } from '@/components/shared/badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoginDialog } from '@/components/shared/login-dialog';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { asLocale } from '@/features/listing/display';
import { ReportButton } from '@/features/report/components/report-button';
import { Link } from '@/i18n/navigation';
import { requestImageUrl } from '@/lib/images';
import { GOI_THO_PATHS, TRADE_ICON } from '../trades';
import { useBudgetText, useRequestActions, useRequestRating, useRequestViewer } from '../use-goi-tho';
import { QuoteCard } from './quote-card';
import { QuoteDialog } from './quote-dialog';
import { RateRequestDialog } from './rate-request-dialog';
import { RequestStatusBadge } from './request-status-badge';

const FRAME = 'mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 sm:py-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start';
const NOT_FOUND = new Set(['not_found', 'invalid_input']);

export function RequestDetailView({ id }: { id: string }) {
  const t = useTranslations('tho');
  const query = useServiceRequest(id);
  if (query.data) return <RequestDetailBody request={query.data} />;
  if (query.isLoading) return <RequestDetailSkeleton />;
  if (!query.error || NOT_FOUND.has(query.error.code)) {
    return (
      <EmptyState
        icon={SearchX}
        title={t('list.empty_title')}
        description={t('detail.no_quotes_body')}
        action={
          <Button asChild>
            <Link href={GOI_THO_PATHS.home}>{t('list.title')}</Link>
          </Button>
        }
      />
    );
  }
  return <ErrorState code={query.error.code} onRetry={() => void query.refetch()} />;
}

export function RequestDetailSkeleton() {
  return (
    <div className={FRAME}>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-44 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-fg">
        <span aria-hidden className="h-5 w-1 rounded-full bg-primary" />
        {title}
      </h2>
      {children}
    </section>
  );
}

type Dialog = 'quote' | 'withdraw' | 'cancel' | 'complete' | 'rate' | null;

function RequestDetailBody({ request }: { request: PublicServiceRequest }) {
  const t = useTranslations('tho');
  const locale = asLocale(useLocale());
  const budget = useBudgetText();
  const session = useSession();
  const viewer = useRequestViewer(request);
  const actions = useRequestActions(request);
  const status = serviceRequestDisplayStatus(request);
  const isCustomer = viewer.role === 'customer';
  const hasOwnQuote = ['quoted', 'accepted', 'declined', 'withdrawn'].includes(viewer.role);
  const quotes = useRequestQuotes(request.id, { enabled: isCustomer || hasOwnQuote });
  const privateInfo = useRequestPrivate(request.id, isCustomer || viewer.role === 'accepted');
  const canRate = (isCustomer || viewer.role === 'accepted') && status === 'completed';
  const rating = useRequestRating(request.id, canRate);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pick, setPick] = useState<RequestQuote | null>(null);
  const close = () => setDialog(null);

  const list = quotes.data ?? [];
  const best = lowestQuoteId(list);
  const accepted = list.find((q) => q.status === 'accepted');
  const open = status === 'open';
  const TradeIcon = TRADE_ICON[request.trade];
  const counterpart = isCustomer ? (accepted?.pro_name ?? null) : request.customer_name;
  const acts = serviceRequestActions(viewer.role, status, { quotesCount: request.quotes_count, rated: rating.rated !== null });
  const has = (a: ServiceRequestAction) => acts.includes(a);
  const chat = () => actions.chat(isCustomer ? (request.accepted_pro_id ?? undefined) : undefined);
  const busy = viewer.loading;

  const guestButton = (
    <Button type="button" className="w-full">
      {t('actions.login')}
    </Button>
  );

  return (
    <div className={FRAME}>
      <div className="flex min-w-0 flex-col gap-5">
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
          <div className="flex flex-wrap gap-1">
            <Badge tone="primary">{t(`trade.${request.trade}`)}</Badge>
            <RequestStatusBadge status={status} />
            <Badge>{t(`urgency.${request.urgency}`)}</Badge>
          </div>
          <div className="flex items-start gap-3">
            <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-md border border-service-goi-tho/20 bg-service-goi-tho-soft">
              <TradeIcon strokeWidth={1.75} className="size-6 text-service-goi-tho" />
            </span>
            <h1 className="min-w-0 flex-1 text-2xl font-bold break-words text-fg">{request.title}</h1>
          </div>
          <p className="text-2xl font-bold text-primary">{budget(request.budget_min, request.budget_max)}</p>
          <div className="flex flex-col gap-2 border-t border-border pt-3 text-md text-muted">
            <p className="flex items-start gap-2">
              <Clock strokeWidth={1.75} className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>
                {[
                  t('detail.posted', { time: formatRelative(request.created_at, locale) }),
                  open ? t('detail.expires', { time: formatDate(request.expires_at, locale, 'datetime') }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </p>
            {request.site_name ? (
              <p className="flex items-start gap-2">
                <MapPin strokeWidth={1.75} className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>{request.site_name}</span>
              </p>
            ) : null}
          </div>
        </section>

        {status === 'cancelled' ? (
          <p role="status" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-md text-fg">
            {t('status.cancelled')}
          </p>
        ) : status === 'expired' ? (
          <p role="status" className="rounded-lg border border-border bg-surface-2 p-3 text-md text-fg">
            {t('status.expired')}
          </p>
        ) : status === 'assigned' && !isCustomer && viewer.role !== 'accepted' ? (
          <p role="status" className="rounded-lg border border-border bg-surface-2 p-3 text-md text-fg">
            {t('status.assigned')}
          </p>
        ) : null}

        {request.images.length > 0 ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {request.images.map((path) => (
              <li key={path} className="relative aspect-square overflow-hidden rounded-md bg-surface-2">
                <Image src={requestImageUrl(path, 'full')} alt={request.title} fill unoptimized sizes="(min-width: 640px) 25vw, 50vw" className="object-cover" />
              </li>
            ))}
          </ul>
        ) : null}

        {request.description ? (
          <Section title={t('detail.section_info')}>
            <p className="text-md break-words whitespace-pre-line text-fg">{request.description}</p>
          </Section>
        ) : null}

        <Section title={t('detail.address_title')}>
          {privateInfo.data?.address_text ? (
            <p className="flex items-start gap-2 rounded-lg border border-border bg-surface p-4 text-md text-fg shadow-card">
              <MapPin strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <span className="break-words">{privateInfo.data.address_text}</span>
            </p>
          ) : (
            <div className="flex flex-col gap-1 rounded-lg border border-primary/30 bg-primary-light p-4">
              {request.site_name ? <p className="text-md font-semibold text-fg">{t('detail.address_area', { site: request.site_name })}</p> : null}
              <p className="text-md text-muted">{isCustomer ? t('form.address_private') : t('detail.address_hidden')}</p>
            </div>
          )}
        </Section>

        {isCustomer || hasOwnQuote ? (
          <Section title={isCustomer ? t('detail.section_quotes', { count: list.length }) : t('detail.section_my_quote')}>
            {quotes.isLoading ? (
              <Skeleton className="h-28 w-full rounded-lg" />
            ) : quotes.isError ? (
              <ErrorState code={quotes.error.code} onRetry={() => void quotes.refetch()} />
            ) : list.length === 0 ? (
              <EmptyState icon={Star} title={t('detail.no_quotes_title')} description={t('detail.no_quotes_body')} />
            ) : (
              <ul className="flex flex-col gap-3">
                {list.map((q) => (
                  <QuoteCard
                    key={q.id}
                    quote={q}
                    lowest={isCustomer && q.id === best && list.filter((x) => x.status === 'submitted').length > 1}
                    onAccept={isCustomer && open && q.status === 'submitted' ? () => setPick(q) : undefined}
                    accepting={actions.accepting}
                    onChat={isCustomer && (q.status === 'submitted' || q.status === 'accepted') ? () => actions.chat(q.pro_id) : undefined}
                  />
                ))}
              </ul>
            )}
          </Section>
        ) : null}

        {!isCustomer ? (
          <Section title={t('detail.customer')}>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
              <UserAvatar avatar={request.customer_avatar_url} name={request.customer_name ?? '…'} />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-md font-semibold text-fg">{request.customer_name ?? '…'}</span>
                {request.customer_rating_count > 0 ? (
                  <span className="text-sm text-muted">{`${Number(request.customer_rating_avg).toFixed(1)} (${request.customer_rating_count})`}</span>
                ) : null}
              </div>
            </div>
          </Section>
        ) : null}

        <aside role="note" className="flex flex-col gap-1 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <p className="text-md font-semibold text-fg">{t('detail.safety_title')}</p>
          <p className="text-sm text-muted">{t('detail.safety_body')}</p>
        </aside>
      </div>

      <aside aria-label={t('detail.title')} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card lg:sticky lg:top-20">
        {busy ? (
          <Skeleton className="h-12 w-full" />
        ) : has('login') ? (
          session.userId === null || !session.userId ? <LoginDialog trigger={guestButton} /> : guestButton
        ) : (
          <>
            {has('quote') ? (
              <Button type="button" className="w-full" onClick={() => setDialog('quote')}>
                {t('actions.quote')}
              </Button>
            ) : null}
            {has('edit_quote') ? (
              <Button type="button" className="w-full" onClick={() => setDialog('quote')}>
                {t('actions.edit_quote')}
              </Button>
            ) : null}
            {has('complete') ? (
              <Button type="button" className="w-full" disabled={actions.completing} onClick={() => setDialog('complete')}>
                <CircleCheck strokeWidth={1.75} aria-hidden />
                {t('actions.complete')}
              </Button>
            ) : null}
            {has('rate') ? (
              <Button type="button" className="w-full" onClick={() => setDialog('rate')}>
                <Star strokeWidth={1.75} aria-hidden />
                {t('actions.rate')}
              </Button>
            ) : null}
            {has('edit') ? (
              <Button asChild variant="outline" className="w-full">
                <Link href={{ pathname: GOI_THO_PATHS.post, query: { id: request.id } }}>{t('actions.edit')}</Link>
              </Button>
            ) : null}
            {has('chat') ? (
              <Button type="button" variant="outline" className="w-full" disabled={actions.openingChat} onClick={chat}>
                <MessageCircle strokeWidth={1.75} aria-hidden />
                {t('actions.chat')}
              </Button>
            ) : null}
            {has('withdraw_quote') ? (
              <Button type="button" variant="outline" className="w-full" onClick={() => setDialog('withdraw')}>
                {t('actions.withdraw_quote')}
              </Button>
            ) : null}
            {has('cancel') ? (
              <Button type="button" variant="outline" className="w-full" onClick={() => setDialog('cancel')}>
                {t('actions.cancel')}
              </Button>
            ) : null}
            {has('accept_quote') ? <p className="text-sm text-muted">{t('detail.section_quotes', { count: list.length })}</p> : null}
          </>
        )}
        {has('report') && !isCustomer ? (
          <ReportButton target="service_request" targetId={request.id} label={t('report.request')} userId={session.isLoading ? undefined : (session.userId ?? null)} />
        ) : null}
      </aside>

      <QuoteDialog
        open={dialog === 'quote'}
        onOpenChange={(o) => !o && close()}
        requestId={request.id}
        existing={viewer.myQuote}
        pending={actions.sending}
        onSubmit={(vars, edited) => actions.sendQuote(vars, edited, close)}
      />
      <ConfirmDialog
        open={dialog === 'withdraw'}
        onOpenChange={(o) => !o && close()}
        title={t('quote.withdraw_title')}
        description={t('quote.withdraw_body')}
        confirmLabel={t('quote.withdraw')}
        destructive
        pending={actions.withdrawing}
        onConfirm={() => (viewer.myQuote ? actions.withdraw(viewer.myQuote.id, close) : close())}
      />
      <ConfirmDialog
        open={dialog === 'cancel'}
        onOpenChange={(o) => !o && close()}
        title={t('actions.cancel_title')}
        description={t('actions.cancel_body')}
        confirmLabel={t('actions.cancel')}
        destructive
        pending={actions.cancelling}
        onConfirm={() => actions.cancel(close)}
      />
      <ConfirmDialog
        open={dialog === 'complete'}
        onOpenChange={(o) => !o && close()}
        title={t('actions.complete_title')}
        description={t('actions.complete_body')}
        confirmLabel={t('actions.complete')}
        pending={actions.completing}
        onConfirm={() => actions.complete(close)}
      />
      <ConfirmDialog
        open={pick !== null}
        onOpenChange={(o) => !o && setPick(null)}
        title={t('quote.accept_title', { name: pick?.pro_name ?? '' })}
        description={t('quote.accept_body')}
        confirmLabel={t('quote.accept')}
        pending={actions.accepting}
        onConfirm={() => (pick ? actions.accept(pick.id, () => setPick(null)) : setPick(null))}
      />
      <RateRequestDialog
        open={dialog === 'rate'}
        onOpenChange={(o) => !o && close()}
        requestId={request.id}
        as={isCustomer ? 'customer' : 'pro'}
        name={counterpart}
      />
    </div>
  );
}
