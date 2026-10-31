// generateMetadata của trang danh sách và chi tiết tin (.claude/rules/web-seo-public.md): title, description,
// canonical + hreflang (vi / en / zh / x-default), Open Graph. robots: trang lọc sâu (> 2 tham số) → noindex.
// Toàn site đang noindex ở layout gốc tới khi ra mắt (tuần 11) — trang không ghi đè thành index.
import type { PublicListing } from '@hp/core';
import { APP_NAME, priceLabel } from '@hp/shared';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { absoluteUrl, localeAlternates } from '@/i18n/alternates';
import { listingImageUrl } from '@/lib/images';
import { asLocale, priceText } from './display';
import { activeFilterCount, filterQuery, parseListFilters } from './filters';
import { getPublicSites } from './queries';
import { type ListScope, scopeInfo } from './scope';

type RawParams = Record<string, string | string[] | undefined>;

const withQuery = (path: string, query: Record<string, string>) => {
  const qs = new URLSearchParams(query).toString();
  return qs ? `${path}?${qs}` : path;
};

export async function listMetadata(scope: ListScope, searchParams: Promise<RawParams>): Promise<Metadata> {
  const { path, categories, seoKey } = scopeInfo(scope);
  const locale = asLocale(await getLocale());
  const t = await getTranslations();
  const filters = parseListFilters(await searchParams, categories);
  const siteName = filters.site ? (await getPublicSites()).find((s) => s.code === filters.site)?.name : undefined;

  const title = siteName
    ? t(`web.listing.${seoKey}.heading_site`, { site: siteName })
    : t(`web.listing.${seoKey}.title`);
  const description = t(`web.listing.${seoKey}.description`);
  // Canonical giữ category + khu (trang có nội dung riêng), bỏ từ khoá tìm kiếm.
  const canonicalPath = withQuery(path, filterQuery({ category: filters.category, site: siteName ? filters.site : null }));

  return {
    title,
    description,
    alternates: localeAlternates(canonicalPath, locale),
    openGraph: { type: 'website', siteName: APP_NAME, title, description, url: absoluteUrl(canonicalPath, locale), locale },
    twitter: { card: 'summary' },
    ...(activeFilterCount(filters) > 2 ? { robots: { index: false, follow: true } } : {}),
  };
}

/** "{tiêu đề} – {giá} – {khu vực}" (layout thêm " | {APP_NAME}"). */
export async function listingMetadata(listing: PublicListing): Promise<Metadata> {
  const locale = asLocale(await getLocale());
  const t = await getTranslations();
  const price = priceText(priceLabel(listing), t, locale);
  const title = [listing.title, price, listing.site_name].filter(Boolean).join(' – ');
  const body = listing.description?.replace(/\s+/g, ' ').trim();
  const description = body
    ? body.length > 160
      ? `${body.slice(0, 157)}…`
      : body
    : [t(`common.category.${listing.category}`), price, listing.site_name].filter(Boolean).join(' · ');
  const path = `/tin/${listing.slug}`;
  const cover = listing.images[0];

  return {
    title,
    description,
    alternates: localeAlternates(path, locale),
    openGraph: {
      type: 'article',
      siteName: APP_NAME,
      title,
      description,
      url: absoluteUrl(path, locale),
      locale,
      ...(cover ? { images: [{ url: listingImageUrl(cover, 'full'), alt: listing.title }] } : {}),
    },
    twitter: { card: cover ? 'summary_large_image' : 'summary' },
  };
}
