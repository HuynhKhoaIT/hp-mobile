// ListingCard — thẻ tin dùng chung danh sách, "Xem thêm", tin tương tự. Hợp đồng hình ảnh với app
// (apps/mobile/src/ui/ListingCard.tsx — đổi một bên thì đổi cả hai, cùng tên prop):
//   1 ảnh bìa 4:3 tràn mép (row: ô vuông bên trái) — chưa có ảnh: nền service-<x>-soft + icon tính năng
//   2 badge danh mục (+ badge ngôn ngữ khi ngôn ngữ tin khác ngôn ngữ trang)
//   3 tiêu đề 2 dòng (16 medium)   4 giá 18 px đậm 700   5 "Cách {khu} {khoảng cách}" (hoặc tên khu) · thời gian đăng
// Cả thẻ là một link tới /tin/{slug}. Không 'use client', không async: render được ở Server Component (SSR danh sách)
// lẫn Client Component (trang tiếp theo của "Xem thêm").
import { listingCover, type PublicListing } from '@hp/core';
import { formatDistance, formatRelative, priceLabel } from '@hp/shared';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/shared/badge';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { listingImageUrl } from '@/lib/images';
import { asLocale, priceText } from '../display';
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

  return (
    <Link
      href={`/tin/${listing.slug}`}
      className={cn(
        'group flex overflow-hidden rounded-md bg-surface shadow-card outline-none transition-transform duration-150',
        'hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        isRow ? 'flex-row items-start gap-3 p-3' : 'flex-col',
      )}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden bg-surface-2',
          isRow ? 'aspect-avatar w-24 rounded-sm sm:w-28' : 'aspect-card w-full',
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
      </div>
      <div className={cn('flex min-w-0 flex-1 flex-col gap-1', !isRow && 'p-3')}>
        <div className="flex flex-wrap gap-1">
          <Badge>{t(`common.category.${listing.category}`)}</Badge>
          {listing.lang !== locale ? (
            <Badge tone="primary" lang={listing.lang}>
              {t(`common.locale.${listing.lang}`)}
            </Badge>
          ) : null}
        </div>
        <h3 lang={listing.lang} className="line-clamp-2 text-md font-medium text-fg">
          {listing.title}
        </h3>
        <p className="text-lg font-bold text-fg">{priceText(priceLabel(listing), t, locale)}</p>
        <p className="line-clamp-1 text-sm text-muted">
          {where ? `${where} · ` : null}
          <time dateTime={listing.created_at}>{when}</time>
        </p>
      </div>
    </Link>
  );
}
