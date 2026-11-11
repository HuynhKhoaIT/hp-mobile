// ListingCard — thẻ tin dùng chung danh sách, "Xem thêm", tin tương tự. Hợp đồng hình ảnh với app
// (apps/mobile/src/ui/ListingCard.tsx — đổi một bên thì đổi cả hai, cùng tên prop). Style Stitch: card bo lg (16), viền
// hairline + bóng nhạt.
//   1 ảnh bìa 4:3 tràn mép (row: ô vuông bo md bên trái) — chưa có ảnh: nền service-<x>-soft + icon tính năng
//   2 chip danh mục (+ "Đã trả lại" cho đồ thất lạc đã về với chủ, + chip ngôn ngữ khi ngôn ngữ tin khác ngôn ngữ trang):
//     grid → nổi ở góc trái trên ảnh (nền surface/90); row → hàng badge trên tiêu đề (ô ảnh 96px quá chật để đè chip)
//   3 tiêu đề 2 dòng (16 semibold)   4 giá 18 px đậm 700 màu primary
//   5 ghim MapPin + "Cách {khu} {khoảng cách}" (hoặc tên khu) · thời gian đăng
// `display` (config.card của tính năng — ListingGrid tự lấy theo category, khớp app): tối đa 3 nhãn thông số dưới giá (trọ:
// diện tích · có gác · ở tối đa), badge danh mục đổi nhãn + tone (đồ thất lạc: "Mất đồ" đỏ / "Nhặt được" xanh), dòng 5 lấy
// nơi + thời điểm từ attributes (đồ thất lạc: place · lost_at).
// Stitch L3 (việc ca kíp, trọ, đồ thất lạc — khớp app): `display.description` (4c) mô tả 2 dòng; `display.owner` (6) dòng
// người đăng (avatar + tên rút gọn của view + dấu xác minh khi có huy hiệu); `display.bookmark` → nút tim lưu tin góc phải
// trên (grid: nổi trên ảnh; row: góc thẻ — ListingCardBookmark, client). Đồ thất lạc đã trả lại: ảnh mờ + tiêu đề gạch
// ngang chữ muted (kèm chip "Đã trả lại" — không chỉ bằng màu).
// Cả thẻ bấm được: link ở tiêu đề phủ toàn thẻ bằng ::after (stretched link) — nút tim là anh em của link (không lồng
// <button> trong <a>), nằm trên lớp phủ (z-10) nên Tab tới riêng được. Vòng focus của link vẽ trong thẻ (ring-inset).
// Không 'use client', không async: render được ở Server Component (SSR danh sách) lẫn Client Component ("Xem thêm").
import { listingCover, type PublicListing } from '@hp/core';
import { formatDistance, formatRelative, priceLabel } from '@hp/shared';
import { BadgeCheck, CircleCheck, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Badge } from '@/components/shared/badge';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { listingImageUrl, profileAvatarUrl } from '@/lib/images';
import { asLocale, attributeString, cardFacts, isReturned, priceText } from '../display';
import type { ListingCardDisplay } from '../feature-config';
import { ListingCardBookmark } from './listing-card-bookmark';
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
  /** Điểm nhấn theo tính năng (config.card). */
  display?: ListingCardDisplay;
};

export function ListingCard({ listing, layout = 'grid', now, priority = false, display }: ListingCardProps) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const cover = listingCover(listing);
  const isRow = layout === 'row';

  const place = attributeString(listing, display?.placeKey);
  const where = place
    ? place
    : listing.site_name && listing.distance_to_site_m !== null
      ? t('listing.card.distance_to_site', {
          site: listing.site_name,
          distance: formatDistance(listing.distance_to_site_m, locale),
        })
      : listing.site_name;
  const time = attributeString(listing, display?.timeKey) ?? listing.created_at;
  const when = formatRelative(time, locale, new Date(now));
  const facts = cardFacts(listing, display?.facts, t, locale);

  const badge = display?.categoryBadge?.[listing.category];
  const category = badge?.labelKey ? t(badge.labelKey) : t(`common.category.${listing.category}`);
  const returned = isReturned(listing) ? t('listing.lost_found.returned_badge') : null;
  const foreign = listing.lang !== locale ? t(`common.locale.${listing.lang}`) : null;
  const description = display?.description ? listing.description?.trim() : null;
  const ownerName = display?.owner ? listing.owner_name?.trim() : null;
  const verified = !!ownerName && listing.owner_badges.some((b) => t.has(`listing.owner_badge.${b}`));
  const avatar = ownerName ? profileAvatarUrl(listing.owner_avatar_url) : null;
  const bookmark = !!display?.bookmark;

  return (
    <article
      className={cn(
        'group relative flex overflow-hidden rounded-lg border border-border bg-surface shadow-card transition duration-150',
        'hover:-translate-y-0.5 hover:border-primary/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
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
            className={cn('object-cover', returned && 'opacity-50')}
          />
        ) : (
          <div className={cn('size-full', returned && 'opacity-50')}>
            <ListingPlaceholder category={listing.category} size={isRow ? 'sm' : 'md'} />
          </div>
        )}
        {isRow ? null : (
          <div className={cn('absolute top-2 left-2 flex flex-wrap items-start gap-1', bookmark ? 'right-12' : 'right-2')}>
            <ImageChip className={badge?.tone === 'danger' ? 'text-danger' : undefined}>{category}</ImageChip>
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
      <div className={cn('flex min-w-0 flex-1 flex-col gap-1', !isRow && 'p-3.5 pt-3', isRow && bookmark && 'pr-9')}>
        {isRow ? (
          <div className="flex flex-wrap gap-1">
            <Badge tone={badge?.tone}>{category}</Badge>
            {returned ? <Badge tone="success">{returned}</Badge> : null}
            {foreign ? (
              <Badge tone="primary" lang={listing.lang}>
                {foreign}
              </Badge>
            ) : null}
          </div>
        ) : null}
        <h3
          lang={listing.lang}
          className={cn('line-clamp-2 text-md leading-snug font-semibold', returned ? 'text-muted line-through' : 'text-fg')}
        >
          {/* Link phủ cả thẻ (::after inset-0 theo <article>): bấm đâu trên thẻ cũng mở tin, trừ nút tim nằm trên lớp phủ. */}
          <Link
            href={`/tin/${listing.slug}`}
            className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
          >
            {listing.title}
          </Link>
        </h3>
        <ListingPrice text={priceText(priceLabel(listing), t, locale)} />
        {facts.length > 0 ? (
          <ul className="flex flex-wrap gap-1">
            {facts.map((f) => (
              <li key={f} className="max-w-full truncate rounded-sm bg-surface-2 px-2 py-0.5 text-sm font-medium text-muted">
                {f}
              </li>
            ))}
          </ul>
        ) : null}
        {description ? (
          <p lang={listing.lang} className="line-clamp-2 text-md text-muted">
            {description}
          </p>
        ) : null}
        <p className="mt-auto flex min-w-0 items-center gap-1 pt-0.5 text-sm text-muted">
          {where ? <MapPin aria-hidden strokeWidth={1.75} className="size-4 shrink-0" /> : null}
          <span className="line-clamp-1 min-w-0">
            {where ? `${where} · ` : null}
            <time dateTime={time}>{when}</time>
          </span>
        </p>
        {ownerName ? (
          <p className="mt-1 flex min-w-0 items-center gap-2 border-t border-border pt-2 text-sm font-medium text-fg">
            <span aria-hidden className="relative size-8 shrink-0 overflow-hidden rounded-full bg-primary-light">
              {avatar ? (
                <Image src={avatar} alt="" fill unoptimized sizes="32px" className="object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-sm font-semibold text-primary">
                  {ownerName.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="truncate">{ownerName}</span>
            {verified ? (
              <>
                <BadgeCheck aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-success" />
                <span className="sr-only">{t('common.profile.verified')}</span>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      {bookmark ? (
        <div className="absolute top-1 right-1 z-10">
          <ListingCardBookmark listingId={listing.id} ownerId={listing.owner_id} overlay={!isRow} />
        </div>
      ) : null}
    </article>
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
