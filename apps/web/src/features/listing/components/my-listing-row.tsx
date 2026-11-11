// Thẻ quản lý một tin của tôi (style Stitch "Quản lý tin đăng") — dùng ở /toi/tin-cua-toi và khối xem trước ở /toi:
//   ảnh bìa vuông 88 / 96 bo md + badge trạng thái (common.status.*) nổi góc trái trên ảnh │ tiêu đề 2 dòng + menu ⋮
//   │ giá 18 px đậm primary │ lượt xem · hết hạn
//   hộp ghi chú chờ duyệt / bị từ chối + lý do (manage.reason.*) │ hàng thao tác nhanh (quickActions) ngăn bởi đường kẻ.
// Đồ thất lạc (Stitch L2 "Đồ thất lạc của tôi", khớp app): nhãn Mất đồ / Nhặt được dưới tiêu đề; đang đăng → nút nhanh chính
// "Đã nhận lại đồ" / "Đã trả cho chủ" (ReturnedDialog); đã trả lại → badge "Đã trả lại" thay "Đã đóng" + nút nhanh chính
// "Cảm ơn người trả đồ" / "Đánh giá người nhận" (RateListingDialog).
// Tin đã bán / đã đóng / hết hạn: viền đứt, ảnh nhạt, tiêu đề + giá màu muted (vẫn ≥ 4,5:1). Không async, không 'use client':
// dùng được cho trang đầu (server) và các trang "Xem thêm" / khối xem trước (client).
import type { MyListing } from '@hp/core';
import { featureOfCategory, formatDate, priceLabel } from '@hp/shared';
import { CircleAlert, Clock, Eye } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/shared/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { listingImageUrl } from '@/lib/images';
import { cn } from '@/lib/utils';
import { asLocale, isReturned, priceText } from '../display';
import { hasPublicPage, isInactive, manageActions, ownerStatus, quickActions, STATUS_TONE } from '../manage';
import { ListingPlaceholder } from './listing-placeholder';
import { MyListingMenu, MyListingQuickActions } from './my-listing-menu';

/** Khung thẻ (dùng chung skeleton để không nhảy bố cục). */
const CARD = 'flex flex-col rounded-lg border bg-surface p-3 shadow-card';
const COVER = 'relative size-22 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2 sm:size-24';

export function MyListingRow({ listing, now }: { listing: MyListing; now: number }) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const status = ownerStatus(listing, now);
  const inactive = isInactive(status);
  const actions = manageActions(listing, now);
  const cover = listing.images[0];
  const reasons = listing.moderation_reasons.filter((r) => t.has(`listing.manage.reason.${r}`));
  const titleHref = hasPublicPage(status) ? `/tin/${listing.slug}` : `/toi/tin-cua-toi/${listing.id}/sua`;
  const price = priceText(priceLabel(listing), t, locale);
  const showExpiry = !!listing.expires_at && (status === 'active' || status === 'expired');
  const note = status === 'pending_review' || status === 'rejected' ? status : null;
  const lostFound = featureOfCategory(listing.category) === 'lostFound';
  const returned = lostFound && isReturned(listing);
  const returnable = lostFound
    ? { title: listing.title, category: listing.category, images: listing.images, attributes: listing.attributes }
    : undefined;

  return (
    <article className={cn(CARD, inactive ? 'border-dashed border-border' : 'border-border')}>
      <div className="flex gap-3">
        <div className={COVER}>
          {cover ? (
            <Image
              src={listingImageUrl(cover, 'thumb')}
              alt=""
              fill
              unoptimized
              sizes="96px"
              className={cn('object-cover', inactive && 'opacity-80 saturate-50')}
            />
          ) : (
            <ListingPlaceholder category={listing.category} size="sm" />
          )}
          <div className="absolute inset-x-1.5 top-1.5 flex">
            <Badge overlay tone={returned ? 'success' : STATUS_TONE[status]}>
              {returned ? t('listing.lost_found.returned_badge') : t(`common.status.${status}`)}
            </Badge>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start gap-1">
            <h3
              lang={listing.lang}
              className={cn('line-clamp-2 flex-1 pt-0.5 text-md leading-snug font-semibold', inactive ? 'text-muted' : 'text-fg')}
            >
              <Link href={titleHref} className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                {listing.title}
              </Link>
            </h3>
            <MyListingMenu id={listing.id} title={listing.title} actions={actions} returnable={returnable} className="-mt-1.5 -mr-1.5" />
          </div>
          {lostFound ? (
            <Badge tone={listing.category === 'found' ? 'success' : 'danger'} className="self-start">
              {t(listing.category === 'found' ? 'listing.lost_found.kind_found' : 'listing.lost_found.kind_lost')}
            </Badge>
          ) : null}
          {price ? <p className={cn('text-lg font-bold', inactive ? 'text-muted' : 'text-primary')}>{price}</p> : null}
          <p className="mt-auto flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Eye aria-hidden strokeWidth={1.75} className="size-4" />
              {t('listing.detail.views', { count: listing.view_count })}
            </span>
            {showExpiry && listing.expires_at ? (
              <>
                <span aria-hidden>·</span>
                <span>{t('listing.manage.expires_on', { date: formatDate(listing.expires_at, locale) })}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {note ? (
        // Hộp nhạt kiểu "Đề nghị" của Stitch: chữ fg (đủ tương phản), icon màu trạng thái.
        <div
          className={cn(
            'mt-2.5 flex items-start gap-2 rounded-md px-2.5 py-1.5 text-sm text-fg',
            note === 'rejected' ? 'bg-danger/10' : 'bg-warning/10',
          )}
        >
          {note === 'rejected' ? (
            <CircleAlert aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-danger" />
          ) : (
            <Clock aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-warning" />
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <p>{note === 'rejected' ? t('listing.manage.rejected_note') : t('listing.manage.pending_note')}</p>
            {reasons.length > 0 ? (
              <ul className="list-inside list-disc">
                {reasons.map((r) => (
                  <li key={r}>{t(`listing.manage.reason.${r}`)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      <MyListingQuickActions id={listing.id} title={listing.title} items={quickActions(status, actions)} returnable={returnable} />
    </article>
  );
}

/** Skeleton đúng hình thẻ quản lý (trang Tin của tôi + khối xem trước ở /toi). */
export function MyListingSkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <ul aria-hidden className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={cn(CARD, 'border-border')}>
          <div className="flex gap-3">
            <Skeleton className={cn(COVER, 'border-0')} />
            <div className="flex flex-1 flex-col gap-2 pt-0.5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="mt-auto h-4 w-1/2" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 border-t border-border pt-2.5">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}
