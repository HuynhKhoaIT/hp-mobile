'use client';

// Panel chi tiết một tin trong hàng chờ. ≥ 1024px: cột phải dính dưới thanh trên, tự cuộn, nút Duyệt / Từ chối ở đầu panel.
// < 1024px: phủ toàn màn hình (như một trang), nút quay lại ở trên, Duyệt / Từ chối dính ở đáy cho dễ bấm bằng ngón cái.
// Nội dung: trạng thái + rủi ro → tiêu đề, giá → lý do vào hàng chờ → ảnh (mở cỡ lớn ở tab mới) → mô tả → thông số
// (readAttributes, giống trang tin) → khu vực → người đăng (SĐT đã che) → lịch sử kiểm duyệt (tải sau).
// Hiển thị cho staff: vẫn tối thiểu PII — không toạ độ, không SĐT đầy đủ, tên rút gọn.
import type { ModerationDetail, ModerationItem } from '@hp/core';
import {
  formatDate,
  formatRelative,
  type ListingStatus,
  type Locale,
  parseReviewNote,
  priceLabel,
  readAttributes,
  riskLevel,
} from '@hp/shared';
import { ArrowLeft, Check, ChevronDown, ChevronUp, ExternalLink, Info, MapPin, Phone, UserRound, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Kbd } from '@/components/admin/kbd';
import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/shared/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { attributeText, priceText } from '@/features/listing/display';
import { ListingPlaceholder } from '@/features/listing/components/listing-placeholder';
import { hasPublicPage } from '@/features/listing/manage';
import { Link } from '@/i18n/navigation';
import { listingImageUrl } from '@/lib/images';
import { cn } from '@/lib/utils';
import { isOwnerBanned, REASON_TONE, RISK_TONE } from '../labels';
import { isNewAccount } from './queue-row';

export type DetailExtras = ModerationDetail | 'loading' | 'error';

type Props = {
  item: ModerationItem;
  extras: DetailExtras;
  locale: Locale;
  now: number;
  /** Vị trí trong trang hiện tại (null = mở bằng link, không nằm trong trang). */
  position: { index: number; total: number } | null;
  /** Có nút Duyệt / Từ chối (tab Chờ duyệt). */
  actionable: boolean;
  busy: boolean;
  sites: Record<string, string>;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
  onRetryExtras: () => void;
};

function Section({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 border-t border-border pt-5">
      <h3 id={id} className="text-md font-semibold text-fg">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function DetailPanel(props: Props) {
  const { item, extras, locale, now, position, actionable, busy, sites, onPrev, onNext, onApprove, onReject, onClose } = props;
  const t = useTranslations();
  const ta = useTranslations('admin.moderation');
  const { listing, owner } = item;
  const nowDate = new Date(now);
  const attributes = readAttributes(listing.category, listing.attributes);
  const level = riskLevel(item.risk_score);
  const status = listing.status as ListingStatus;
  const detail = typeof extras === 'object' ? extras : null;
  const stale = item.status === 'pending' && (listing.deleted_at !== null || listing.status !== 'pending_review');
  const canAct = actionable && item.status === 'pending' && !stale;
  const siteName = listing.site ? (sites[listing.site] ?? listing.site) : null;
  const headingId = `detail-${item.id}`;

  const actions = canAct ? (
    <div className="flex gap-2">
      <Button onClick={onApprove} disabled={busy} className="flex-1 lg:flex-none">
        <Check strokeWidth={1.75} aria-hidden />
        {ta('detail.approve')}
        <Kbd className="ml-1 hidden border-on-primary/30 bg-on-primary/15 text-on-primary lg:inline-flex">A</Kbd>
      </Button>
      <Button variant="destructive" onClick={onReject} disabled={busy} className="flex-1 lg:flex-none">
        <X strokeWidth={1.75} aria-hidden />
        {ta('detail.reject')}
        <Kbd className="ml-1 hidden border-danger/30 bg-danger/10 text-danger lg:inline-flex">R</Kbd>
      </Button>
    </div>
  ) : null;

  return (
    <article aria-labelledby={headingId} className="flex min-h-0 flex-1 flex-col">
      {/* Thanh trên panel */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-surface px-2 py-2 lg:px-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose} aria-label={ta('detail.back')}>
          <ArrowLeft strokeWidth={1.75} />
        </Button>
        {position ? (
          <span className="text-sm font-medium text-muted">{ta('detail.position', { current: position.index + 1, total: position.total })}</span>
        ) : null}
        <div className="flex items-center">
          <Button variant="ghost" size="icon" disabled={!onPrev} onClick={onPrev ?? undefined} aria-label={ta('detail.prev')} title={ta('detail.prev')}>
            <ChevronUp strokeWidth={1.75} />
          </Button>
          <Button variant="ghost" size="icon" disabled={!onNext} onClick={onNext ?? undefined} aria-label={ta('detail.next')} title={ta('detail.next')}>
            <ChevronDown strokeWidth={1.75} />
          </Button>
        </div>
        <div className="flex-1" />
        {hasPublicPage(status) && !listing.deleted_at ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/tin/${listing.slug}`} target="_blank" rel="noopener">
              <ExternalLink strokeWidth={1.75} aria-hidden />
              <span className="hidden sm:inline">{ta('detail.open_public')}</span>
              <span className="sr-only sm:hidden">{ta('detail.open_public')}</span>
            </Link>
          </Button>
        ) : null}
        <div className="hidden lg:block">{actions}</div>
      </div>

      {/* Nội dung */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 py-5 lg:px-6">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {item.status !== 'pending' ? (
              <StatusBadge kind="queue" status={item.status} label={ta(`detail.history_status.${item.status}`)} />
            ) : null}
            {/* Trạng thái tin hiện tại: luôn hiện khi chờ duyệt; đã xử lý thì chỉ hiện khi khác kết quả (vd đã duyệt rồi đã bán). */}
            {item.status === 'pending' || status !== (item.status === 'approved' ? 'active' : 'rejected') ? (
              <StatusBadge kind="listing" status={status} label={t(`common.status.${status}`)} />
            ) : null}
            <Badge>{t(`common.category.${listing.category}`)}</Badge>
            <Badge tone={RISK_TONE[level]}>
              {ta(`risk_level.${level}`)} · {item.risk_score}
            </Badge>
          </div>
          <h2 id={headingId} lang={listing.lang} className="text-2xl font-semibold text-fg">
            {listing.title}
          </h2>
          <p className="text-2xl font-bold text-fg">{priceText(priceLabel(listing), t, locale)}</p>
          <p className="text-sm text-muted">
            <time dateTime={listing.created_at}>{ta('posted', { time: formatRelative(listing.created_at, locale, nowDate) })}</time>
            {' · '}
            {formatDate(listing.created_at, locale, 'datetime')}
            {' · #'}
            {listing.short_id}
          </p>
          {stale ? (
            <p role="status" className="flex items-start gap-2 rounded-md bg-surface-2 p-3 text-md text-fg">
              <Info strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
              {listing.deleted_at ? ta('detail.deleted_listing') : ta('detail.not_pending')}
            </p>
          ) : null}
        </header>

        {item.reasons.length > 0 ? (
          <Section id={`${headingId}-reasons`} title={ta('detail.reasons')}>
            <ul className="flex flex-wrap gap-2">
              {item.reasons.map((r) => (
                <li key={r}>
                  <Badge tone={REASON_TONE[r]}>{t(`listing.manage.reason.${r}`)}</Badge>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section id={`${headingId}-images`} title={ta('detail.images', { count: listing.images.length })}>
          {listing.images.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {listing.images.map((path, i) => (
                <li key={path}>
                  <a
                    href={listingImageUrl(path, 'full')}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={ta('detail.open_image', { n: i + 1 })}
                    className="relative block aspect-avatar overflow-hidden rounded-sm bg-surface-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Image src={listingImageUrl(path, 'thumb')} alt="" fill unoptimized sizes="160px" className="object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-3">
              <div className="aspect-avatar w-20 overflow-hidden rounded-sm">
                <ListingPlaceholder category={listing.category} size="sm" />
              </div>
              <p className="text-md text-muted">{ta('no_image')}</p>
            </div>
          )}
        </Section>

        <Section id={`${headingId}-description`} title={ta('detail.description')}>
          {listing.description?.trim() ? (
            <p lang={listing.lang} className="text-md whitespace-pre-line text-fg">
              {listing.description}
            </p>
          ) : (
            <p className="text-md text-muted">{ta('detail.no_description')}</p>
          )}
        </Section>

        {attributes.length > 0 ? (
          <Section id={`${headingId}-attributes`} title={ta('detail.attributes')}>
            <dl className="grid gap-x-6 sm:grid-cols-2">
              {attributes.map(({ field, value }) => (
                <div key={field.key} className="flex justify-between gap-4 border-b border-border py-2.5">
                  <dt className="text-md text-muted">{t(`listing.attr.${field.key}`)}</dt>
                  <dd lang={field.kind === 'text' ? listing.lang : undefined} className="text-right text-md font-medium text-fg">
                    {attributeText(field, value, t, locale)}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        ) : null}

        {siteName || listing.address_text ? (
          <Section id={`${headingId}-location`} title={ta('detail.location')}>
            {siteName ? (
              <p className="flex items-start gap-2 text-md text-fg">
                <MapPin strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
                {siteName}
              </p>
            ) : null}
            {listing.address_text ? (
              <p className="text-md text-fg">
                <span className="text-muted">{ta('detail.address')}: </span>
                {listing.address_text}
              </p>
            ) : null}
          </Section>
        ) : null}

        <Section id={`${headingId}-owner`} title={ta('detail.owner')}>
          {owner ? (
            <div className="flex flex-col gap-3 rounded-md bg-surface-2 p-4">
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
                  <UserRound strokeWidth={1.75} className="size-6" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-md font-semibold text-fg">
                    {owner.deleted ? ta('deleted_owner') : (owner.display_name ?? ta('unknown_owner'))}
                  </span>
                  <span className="flex flex-wrap gap-1.5 pt-1">
                    {owner.role !== 'user' ? <Badge tone="primary">{t(`admin.role.${owner.role}`)}</Badge> : null}
                    {isNewAccount(owner.created_at, now) ? <Badge tone="warning">{ta('new_account')}</Badge> : null}
                    {isOwnerBanned(owner, now) ? (
                      <Badge tone="danger">{ta('banned')}</Badge>
                    ) : null}
                  </span>
                </div>
              </div>
              <dl className="grid gap-2 text-md sm:grid-cols-2">
                {owner.phone_masked ? (
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">{ta('detail.phone')}</dt>
                    <Phone strokeWidth={1.75} className="size-4 shrink-0 text-muted" aria-hidden />
                    <dd className="font-medium text-fg tabular-nums">{owner.phone_masked}</dd>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-x-2">
                  <dt className="text-muted">{ta('detail.joined')}</dt>
                  <dd className="text-fg">
                    {formatDate(owner.created_at, locale, 'date')} ({formatRelative(owner.created_at, locale, nowDate)})
                  </dd>
                </div>
              </dl>
              {detail ? (
                <p className="text-sm text-muted">
                  {ta('detail.listing_count', { count: detail.owner_stats.listings })}
                  {' · '}
                  <span className={cn(detail.owner_stats.rejected > 0 && 'font-medium text-danger')}>
                    {ta('detail.rejected_count', { count: detail.owner_stats.rejected })}
                  </span>
                </p>
              ) : extras === 'loading' ? (
                <Skeleton className="h-5 w-48" />
              ) : null}
            </div>
          ) : (
            <p className="text-md text-muted">{ta('unknown_owner')}</p>
          )}
        </Section>

        <Section id={`${headingId}-history`} title={ta('detail.history')}>
          {detail ? (
            <ol className="flex flex-col">
              {detail.history.map((h, i) => {
                const note = parseReviewNote(h.note);
                return (
                  <li key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < detail.history.length - 1 ? (
                      <span aria-hidden className="absolute top-6 bottom-0 left-2.5 w-px bg-border" />
                    ) : null}
                    <span
                      aria-hidden
                      className={cn(
                        'relative mt-1 size-5 shrink-0 rounded-full border-4 border-surface',
                        h.status === 'approved' ? 'bg-success' : h.status === 'rejected' ? 'bg-danger' : 'bg-warning',
                      )}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="flex flex-wrap items-center gap-2 text-md font-medium text-fg">
                        {ta(`detail.history_status.${h.status}`)}
                        {h.status !== 'pending' ? (
                          <span className="text-sm font-normal text-muted">
                            {h.reviewed_by ? ta('detail.history_by', { name: h.reviewer_name ?? '?' }) : ta('detail.history_system')}
                            {h.reviewed_at ? ` · ${formatRelative(h.reviewed_at, locale, nowDate)}` : ''}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm text-muted">{ta('detail.history_entered', { time: formatDate(h.created_at, locale, 'datetime') })}</p>
                      {h.reasons.length > 0 ? (
                        <ul className="flex flex-wrap gap-1">
                          {h.reasons.map((r) => (
                            <li key={r}>
                              <Badge tone={REASON_TONE[r]} className="px-2 py-0.5">
                                {t(`listing.manage.reason.${r}`)}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {note.reason || note.text ? (
                        <p className="rounded-sm bg-surface-2 px-3 py-2 text-sm text-fg">
                          <span className="font-medium">{ta('detail.note')}: </span>
                          {note.reason ? t(`admin.reasons.${note.reason}`) : null}
                          {note.reason && note.text ? ' — ' : null}
                          {note.text}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : extras === 'loading' ? (
            <div className="flex flex-col gap-2" aria-label={ta('detail.loading_extra')}>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-md text-muted">{ta('detail.extra_error')}</p>
              <Button variant="outline" size="sm" onClick={props.onRetryExtras}>
                {t('common.actions.retry')}
              </Button>
            </div>
          )}
        </Section>

        <div className="hidden flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-sm text-muted lg:flex">
          <span className="font-medium">{ta('shortcuts.title')}</span>
          {actionable ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>A</Kbd> {ta('shortcuts.approve')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>R</Kbd> {ta('shortcuts.reject')}
              </span>
            </>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Kbd>J</Kbd> {ta('shortcuts.next')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>K</Kbd> {ta('shortcuts.prev')}
          </span>
        </div>
      </div>

      {/* Đáy (điện thoại / tablet): nút lớn dính dưới */}
      {actions ? <div className="sticky bottom-0 border-t border-border bg-surface p-3 pb-safe lg:hidden">{actions}</div> : null}
    </article>
  );
}

/** Panel khi chưa chọn tin (chỉ desktop). */
export function DetailPlaceholder() {
  const t = useTranslations('admin.moderation.detail');
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-lg font-semibold text-fg">{t('placeholder_title')}</p>
      <p className="max-w-sm text-md text-muted">{t('placeholder_body')}</p>
    </div>
  );
}
