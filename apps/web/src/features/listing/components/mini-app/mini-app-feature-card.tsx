// Thẻ lớn đầu khối `featured` của trang chủ mini-app (Stitch room_home "Phòng trọ giá tốt ca kíp"), Server Component:
// ảnh bìa 4:3 (từ 640px: ảnh trái nửa thẻ) + nhãn danh mục / tình trạng ("Đang cho thuê" — config.detail.activeStatusKey) +
// "N ảnh" + tim lưu tin → giá (đơn vị chữ nhỏ) → nhãn thông số (config.card.facts: diện tích · có gác…) → tiêu đề (link phủ
// cả thẻ) → khu / khoảng cách → tối đa 4 tiện nghi (thông số bool = true của nhóm `amenities` — ATTRIBUTE_GROUPS) → Gọi /
// Nhắn tin (MiniAppCardContact, client). Ảnh đầu `priority` (LCP của trang chủ).
// Khác Stitch (cố ý): không "100% xác thực", "Đi bộ đi làm", trạng thái online — chưa có dữ liệu.
import { listingCover, type PublicListing } from '@hp/core';
import { formatDistance, groupAttributeRows, priceLabel, readAttributes } from '@hp/shared';
import { Camera, CircleCheck, MapPin } from 'lucide-react';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/shared/badge';
import { Link } from '@/i18n/navigation';
import { listingImageUrl } from '@/lib/images';
import { asLocale, cardFacts, priceText } from '../../display';
import type { MiniAppConfig } from '../../mini-app';
import { ListingCardBookmark } from '../listing-card-bookmark';
import { ListingPlaceholder } from '../listing-placeholder';
import { MiniAppCardContact } from './mini-app-card-contact';

const MAX_AMENITIES = 4;

export async function MiniAppFeatureCard({ cfg, listing }: { cfg: MiniAppConfig; listing: PublicListing }) {
  const t = await getTranslations();
  const locale = asLocale(await getLocale());
  const list = cfg.miniApp.list;
  const cover = listingCover(listing);
  const price = priceText(priceLabel(listing), t, locale);
  const cut = price.lastIndexOf('/');
  const facts = cardFacts(listing, cfg.card?.facts, t, locale);
  const factKeys = new Set(cfg.card?.facts ?? []);
  const amenities =
    groupAttributeRows(listing.category, readAttributes(listing.category, listing.attributes))
      .groups.find((g) => g.key === 'amenities')
      ?.rows.filter((r) => r.value === true && !factKeys.has(r.field.key))
      .slice(0, MAX_AMENITIES) ?? [];
  const where =
    listing.site_name && listing.distance_to_site_m !== null
      ? t('listing.card.distance_to_site', { site: listing.site_name, distance: formatDistance(listing.distance_to_site_m, locale) })
      : listing.site_name;
  const status = t(cfg.detail?.activeStatusKey ?? `listing.availability.${cfg.feature}`);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card transition duration-150 hover:border-primary/20 sm:flex-row">
      <div className="relative aspect-card w-full shrink-0 overflow-hidden bg-surface-2 sm:w-1/2">
        {cover ? (
          <Image
            src={listingImageUrl(cover, 'full')}
            alt=""
            fill
            unoptimized
            priority
            sizes="(min-width: 1152px) 576px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <ListingPlaceholder category={listing.category} size="lg" />
        )}
        <div className="absolute top-2 right-12 left-2 flex flex-wrap items-start gap-1">
          <Badge overlay>{t(`common.category.${listing.category}`)}</Badge>
          <Badge overlay tone="success">
            <CircleCheck aria-hidden strokeWidth={2} className="mr-1 inline size-3.5 text-success" />
            {status}
          </Badge>
        </div>
        {list && listing.images.length > 1 ? (
          <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-sm bg-surface/90 px-2 py-0.5 text-xs font-semibold text-fg shadow-card backdrop-blur-sm">
            <Camera aria-hidden strokeWidth={1.75} className="size-3.5" />
            {t(list.photosKey, { count: listing.images.length })}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        {price ? (
          <p className="text-xl font-bold text-primary">
            {cut > 0 ? price.slice(0, cut) : price}
            {cut > 0 ? (
              <>
                <wbr />
                <span className="text-sm font-semibold text-muted">{price.slice(cut)}</span>
              </>
            ) : null}
          </p>
        ) : null}
        {facts.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {facts.map((f) => (
              <li key={f} className="rounded-sm bg-primary-light px-2.5 py-1 text-sm font-semibold text-primary">
                {f}
              </li>
            ))}
          </ul>
        ) : null}
        <h3 lang={listing.lang} className="line-clamp-2 text-lg leading-snug font-semibold text-fg">
          <Link
            href={`/tin/${listing.slug}`}
            className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
          >
            {listing.title}
          </Link>
        </h3>
        {where ? (
          <p className="flex min-w-0 items-center gap-1 text-sm text-muted">
            <MapPin aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
            <span className="line-clamp-1">{where}</span>
          </p>
        ) : null}
        {amenities.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {amenities.map((a) => (
              <li key={a.field.key} className="rounded-full bg-surface-2 px-3 py-1 text-sm font-medium text-fg">
                {t(`listing.attr.${a.field.key}`)}
              </li>
            ))}
          </ul>
        ) : null}
        {list ? (
          <div className="mt-auto pt-1">
            <MiniAppCardContact
              listingId={listing.id}
              ownerId={listing.owner_id}
              threadBase={cfg.miniApp.paths.chat}
              callLabel={t(list.callKey)}
              chatLabel={t(list.chatKey)}
            />
          </div>
        ) : null}
      </div>

      <div className="absolute top-1 right-1 z-10">
        <ListingCardBookmark listingId={listing.id} ownerId={listing.owner_id} overlay />
      </div>
    </article>
  );
}
