// ListingCard — thẻ tin dùng chung danh sách, "Xem thêm", tin tương tự. Hợp đồng hình ảnh với app
// (apps/mobile/src/ui/ListingCard.tsx — đổi một bên thì đổi cả hai, cùng tên prop). Style Stitch: card bo lg (16), viền
// hairline + bóng nhạt.
//   1 ảnh bìa 4:3 tràn mép (row: ô vuông bo md bên trái) — chưa có ảnh: nền service-<x>-soft + icon tính năng
//   2 chip danh mục (+ "Đã trả lại" cho đồ thất lạc đã về với chủ, + chip ngôn ngữ khi ngôn ngữ tin khác ngôn ngữ trang):
//     grid → nổi ở góc trái trên ảnh (nền surface/90); row → hàng badge trên tiêu đề (ô ảnh 96px quá chật để đè chip)
//   3 tiêu đề 2 dòng (16 semibold)   4 giá 18 px đậm 700 màu primary
//   5 ghim MapPin + "Cách {khu} {khoảng cách}" (hoặc tên khu) · thời gian đăng
// Cả thẻ là một link tới /tin/{slug}. Không 'use client', không async: render được ở Server Component (SSR danh sách)
// lẫn Client Component (trang tiếp theo của "Xem thêm").
import { listingCover, type PublicListing } from '@hp/core';
import { formatDistance, formatRelative, priceLabel } from '@hp/shared';
import { CircleCheck, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Badge } from '@/components/shared/badge';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { listingImageUrl } from '@/lib/images';
import { asLocale, isReturned, priceText } from '../display';
import { ListingPlaceholder } from './listing-placeholder';

export type ListingCardProps = {
  listing: PublicListing;
  layout?: 'grid' | 'row';
  /**
   * Mốc "bây giờ" (ms) cho thời gian tương đối = thời điểm đọc dữ liệu (queries.ts / "Xem thêm"). Bắt buộc ở web:
   * Cache Components không cho new Date() khi prerender và component phải thuần. App không cần prop này.
   */
  now: number;
  /** Ảnh bìa tải sớm (thẻ đầu màn hình, LCP). */
  priority?: boolean;
};

export function ListingCard({ listing, layout = 'grid', now, priority = false }: ListingCardProps) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const cover = listingCover(listing);
  const isRow = layout === 'row';

  const where =
    listing.site_name && listing.distance_to_site_m !== null
      ? t('listing.card.distance_to_site', {
          site: listing.site_name,
          distance: formatDistance(listing.distance_to_site_m, locale),
        })
      : listing.site_name;
  const when = formatRelative(listing.created_at, locale, new Date(now));

  const category = t(`common.category.${listing.category}`);
  const returned = isReturned(listing) ? t('listing.lost_found.returned_badge') : null;
  const foreign = listing.lang !== locale ? t(`common.locale.${listing.lang}`) : null;

  return (
    <Link
      href={`/tin/${listing.slug}`}
      className={cn(
        'group flex overflow-hidden rounded-lg border border-border bg-surface shadow-card outline-none transition duration-150',
        'hover:-translate-y-0.5 hover:border-primary/20 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        isRow ? 'flex-row items-start gap-3 p-3' : 'flex-col',
      )}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden bg-surface-2',
          isRow ? 'aspect-avatar w-24 rounded-md sm:w-28' : 'aspect-card w-full',
        )}
      >
        {cover ? (
          <Image
            src={listingImageUrl(cover, 'thumb')}
            alt=""
            fill
            unoptimized
            priority={priority}
            sizes={isRow ? '112px' : '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw'}
            className="object-cover"
          />
        ) : (
          <ListingPlaceholder category={listing.category} size={isRow ? 'sm' : 'md'} />
        )}
        {isRow ? null : (
          <div className="absolute inset-x-2 top-2 flex flex-wrap items-start gap-1">
            <ImageChip>{category}</ImageChip>
            {returned ? (
              <ImageChip icon={<CircleCheck aria-hidden strokeWidth={2} className="size-3.5 shrink-0 text-success" />}>
                {returned}
              </ImageChip>
            ) : null}
            {foreign ? (
              <ImageChip lang={listing.lang} className="bg-primary-light/95 text-primary">
                {foreign}
              </ImageChip>
            ) : null}
          </div>
        )}
      </div>
      <div className={cn('flex min-w-0 flex-1 flex-col gap-1', !isRow && 'p-3.5 pt-3')}>
        {isRow ? (
          <div className="flex flex-wrap gap-1">
            <Badge>{category}</Badge>
            {returned ? <Badge tone="success">{returned}</Badge> : null}
            {foreign ? (
              <Badge tone="primary" lang={listing.lang}>
                {foreign}
              </Badge>
            ) : null}
          </div>
        ) : null}
        <h3 lang={listing.lang} className="line-clamp-2 text-md leading-snug font-semibold text-fg">
          {listing.title}
        </h3>
        <ListingPrice text={priceText(priceLabel(listing), t, locale)} />
        <p className="mt-auto flex min-w-0 items-center gap-1 pt-0.5 text-sm text-muted">
          {where ? <MapPin aria-hidden strokeWidth={1.75} className="size-4 shrink-0" /> : null}
          <span className="line-clamp-1 min-w-0">
            {where ? `${where} · ` : null}
            <time dateTime={listing.created_at}>{when}</time>
          </span>
        </p>
      </div>
    </Link>
  );
}

/** Chip nổi trên ảnh bìa (layout grid): nền surface/90 + mờ nền để đọc rõ trên mọi ảnh. */
function ImageChip({
  children,
  icon,
  className,
  lang,
}: {
  children: string;
  icon?: ReactNode;
  className?: string;
  lang?: string;
}) {
  return (
    <span
      lang={lang}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-sm bg-surface/90 px-2 py-0.5 text-xs font-semibold text-fg shadow-card backdrop-blur-sm',
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

/**
 * Giá + đơn vị ("2.500.000 ₫" + "/tháng"): formatMoney nối số và ₫ bằng dấu cách không ngắt nên cả chuỗi không xuống dòng
 * được → bị cắt ở thẻ hẹp. Tách đơn vị sau dấu "/" cuối thành chữ nhỏ, cho phép xuống dòng trước nó (giống app).
 */
function ListingPrice({ text }: { text: string }) {
  if (!text) return null;
  const cut = text.lastIndexOf('/');
  if (cut <= 0) return <p className="text-lg font-bold text-primary">{text}</p>;
  return (
    <p className="text-lg font-bold text-primary">
      {text.slice(0, cut)}
      <wbr />
      <span className="text-sm font-semibold text-muted">{text.slice(cut)}</span>
    </p>
  );
}
