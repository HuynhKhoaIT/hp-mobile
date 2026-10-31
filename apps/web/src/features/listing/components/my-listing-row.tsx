// Một dòng "Tin của tôi": ảnh bìa · tiêu đề · badge trạng thái (common.status.*) · giá · hết hạn · lượt xem
// · ghi chú chờ duyệt / bị từ chối + lý do (manage.reason.*) · menu thao tác. Không async, không 'use client':
// dùng được cho trang đầu (server) và các trang "Xem thêm" (client).
import type { MyListing } from '@hp/core';
import { formatDate, priceLabel } from '@hp/shared';
import { Eye } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/shared/badge';
import { Link } from '@/i18n/navigation';
import { listingImageUrl } from '@/lib/images';
import { asLocale, priceText } from '../display';
import { hasPublicPage, manageActions, ownerStatus, STATUS_TONE } from '../manage';
import { ListingPlaceholder } from './listing-placeholder';
import { MyListingMenu } from './my-listing-menu';

export function MyListingRow({ listing, now }: { listing: MyListing; now: number }) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const status = ownerStatus(listing, now);
  const cover = listing.images[0];
  const reasons = listing.moderation_reasons.filter((r) => t.has(`listing.manage.reason.${r}`));
  const titleHref = hasPublicPage(status) ? `/tin/${listing.slug}` : `/toi/tin-cua-toi/${listing.id}/sua`;

  return (
    <article className="flex gap-3 rounded-md bg-surface p-3 shadow-card">
      <div className="relative aspect-avatar w-20 shrink-0 overflow-hidden rounded-sm bg-surface-2 sm:w-24">
        {cover ? (
          <Image src={listingImageUrl(cover, 'thumb')} alt="" fill unoptimized sizes="96px" className="object-cover" />
        ) : (
          <ListingPlaceholder category={listing.category} size="sm" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start gap-2">
          <h3 lang={listing.lang} className="line-clamp-2 flex-1 text-md font-medium text-fg">
            <Link href={titleHref} className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
              {listing.title}
            </Link>
          </h3>
          <MyListingMenu
            id={listing.id}
            title={listing.title}
            actions={manageActions(listing, now)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[status]}>{t(`common.status.${status}`)}</Badge>
          <span className="text-md font-bold text-fg">{priceText(priceLabel(listing), t, locale)}</span>
        </div>
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
          {listing.expires_at && (status === 'active' || status === 'expired') ? (
            <span>{t('listing.manage.expires_on', { date: formatDate(listing.expires_at, locale) })}</span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Eye aria-hidden strokeWidth={1.75} className="size-4" />
            {t('listing.detail.views', { count: listing.view_count })}
          </span>
        </p>
        {status === 'pending_review' || status === 'rejected' ? (
          <div className={status === 'rejected' ? 'text-sm text-danger' : 'text-sm text-fg'}>
            <p>{status === 'rejected' ? t('listing.manage.rejected_note') : t('listing.manage.pending_note')}</p>
            {reasons.length > 0 ? (
              <ul className="list-inside list-disc text-muted">
                {reasons.map((r) => (
                  <li key={r}>{t(`listing.manage.reason.${r}`)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
