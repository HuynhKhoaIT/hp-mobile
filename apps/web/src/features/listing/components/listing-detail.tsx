// Chi tiết tin — thứ tự khớp app: gallery → tiêu đề, giá, badge, thời gian + lượt xem → lời nhắc an toàn → thông số
// (readAttributes) → mô tả → khu vực (gần đúng ~300 m) → người đăng → Nhắn tin / Chia sẻ → tin tương tự.
// ≥ 1024px: 2 cột — gallery + thông số trái; tiêu đề, giá, người đăng, nút dính bên phải. Điện thoại: một cột đúng thứ tự trên
// (khối phải dùng `contents` + `order` để xen giữa các khối trái mà không lặp DOM).
// Trang công khai: không SĐT, không toạ độ, không địa chỉ chi tiết; tên người đăng đã rút gọn ở view.
import type { PublicListing } from '@hp/core';
import { formatDistance, formatRelative, priceLabel, readAttributes } from '@hp/shared';
import { ChevronLeft, MapPin, ShieldAlert } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/shared/badge';
import { JsonLd } from '@/components/shared/json-ld';
import { absoluteUrl } from '@/i18n/alternates';
import { Link } from '@/i18n/navigation';
import { attributeText, asLocale, priceText } from '../display';
import { configOfCategory } from '../features';
import { listingJsonLd } from '../json-ld';
import { getSimilarListings } from '../queries';
import { ListingActions } from './listing-actions';
import { ListingGallery } from './listing-gallery';
import { ListingGrid } from './listing-grid';
import { ListingPlaceholder } from './listing-placeholder';
import { PosterCard } from './poster-card';

export async function ListingDetail({ listing, now }: { listing: PublicListing; now: number }) {
  const t = await getTranslations();
  const locale = asLocale(await getLocale());
  const cfg = configOfCategory(listing.category);
  const attributes = readAttributes(listing.category, listing.attributes);
  const similar = await getSimilarListings(listing.id);
  const categoryName = t(`common.category.${listing.category}`);
  const jsonLd = listingJsonLd(listing, cfg.jsonLd, { url: absoluteUrl(`/tin/${listing.slug}`, locale), categoryName });

  return (
    <article className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <nav>
        <Link
          href={cfg.path}
          className="inline-flex min-h-11 items-center gap-1 rounded-md text-md font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronLeft strokeWidth={1.75} className="size-5" aria-hidden />
          {t('listing.detail.back_to_list')}
        </Link>
      </nav>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="order-1 lg:col-span-7 lg:row-start-1">
          {listing.images.length > 0 ? (
            <ListingGallery images={listing.images} title={listing.title} />
          ) : (
            <div className="aspect-card w-full overflow-hidden rounded-lg">
              <ListingPlaceholder category={listing.category} size="lg" />
            </div>
          )}
        </div>

        {/* Cột phải (desktop, dính khi cuộn). Điện thoại: `contents` để các khối con xếp theo order giữa cột trái. */}
        <div className="contents lg:sticky lg:top-20 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
          <header className="order-2 flex flex-col gap-2">
            <div className="flex flex-wrap gap-1">
              <Badge>{categoryName}</Badge>
              {listing.lang !== locale ? (
                <Badge tone="primary" lang={listing.lang}>
                  {t(`common.locale.${listing.lang}`)}
                </Badge>
              ) : null}
            </div>
            <h1 lang={listing.lang} className="text-2xl font-semibold text-fg">
              {listing.title}
            </h1>
            <p className="text-2xl font-bold text-fg">{priceText(priceLabel(listing), t, locale)}</p>
            <p className="text-sm text-muted">
              <time dateTime={listing.created_at}>
                {t('listing.detail.posted_at', { time: formatRelative(listing.created_at, locale, new Date(now)) })}
              </time>
              {' · '}
              {t('listing.detail.views', { count: listing.view_count })}
            </p>
          </header>

          <p role="note" className="order-3 flex items-start gap-3 rounded-md bg-warning/15 p-3 text-md text-fg">
            <ShieldAlert strokeWidth={1.75} className="mt-0.5 size-5 shrink-0" aria-hidden />
            {t('listing.detail.safety_tip')}
          </p>

          <div className="order-7">
            <PosterCard listing={listing} locale={locale} />
          </div>
          <div className="order-8">
            <ListingActions listingId={listing.id} slug={listing.slug} title={listing.title} />
          </div>
        </div>

        <div className="contents lg:col-span-7 lg:row-start-2 lg:flex lg:flex-col lg:gap-6">
          {attributes.length > 0 ? (
            <section aria-labelledby="attributes-heading" className="order-4 flex flex-col gap-2">
              <h2 id="attributes-heading" className="text-lg font-semibold text-fg">
                {t('listing.detail.attributes')}
              </h2>
              <dl className="grid gap-x-6 sm:grid-cols-2">
                {attributes.map(({ field, value }) => (
                  <div key={field.key} className="flex justify-between gap-4 border-b border-border py-3">
                    <dt className="text-md text-muted">{t(`listing.attr.${field.key}`)}</dt>
                    <dd lang={field.kind === 'text' ? listing.lang : undefined} className="text-right text-md font-medium text-fg">
                      {attributeText(field, value, t, locale)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section aria-labelledby="description-heading" className="order-5 flex flex-col gap-2">
            <h2 id="description-heading" className="text-lg font-semibold text-fg">
              {t('listing.detail.description')}
            </h2>
            {listing.description?.trim() ? (
              <p lang={listing.lang} className="text-md whitespace-pre-line text-fg">
                {listing.description}
              </p>
            ) : (
              <p className="text-md text-muted">{t('listing.detail.no_description')}</p>
            )}
          </section>

          {listing.site_name ? (
            <section aria-labelledby="location-heading" className="order-6 flex flex-col gap-2">
              <h2 id="location-heading" className="text-lg font-semibold text-fg">
                {t('listing.detail.location')}
              </h2>
              <p className="flex items-start gap-2 text-md text-fg">
                <MapPin strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
                {listing.distance_to_site_m !== null
                  ? t('listing.card.distance_to_site', {
                      site: listing.site_name,
                      distance: formatDistance(listing.distance_to_site_m, locale),
                    })
                  : listing.site_name}
              </p>
              <p className="text-sm text-muted">{t('listing.detail.approx_location')}</p>
            </section>
          ) : null}
        </div>
      </div>

      {similar.length > 0 ? (
        <section aria-labelledby="similar-heading" className="flex flex-col gap-3 pt-4">
          <h2 id="similar-heading" className="text-xl font-semibold text-fg">
            {t('listing.detail.similar')}
          </h2>
          <ListingGrid items={similar} now={now} layout={cfg.cardLayout} />
        </section>
      ) : null}
    </article>
  );
}
