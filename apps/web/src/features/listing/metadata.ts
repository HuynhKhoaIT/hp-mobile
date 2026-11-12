// generateMetadata của trang danh sách và chi tiết tin (.claude/rules/web-seo-public.md): title, description,
// canonical + hreflang (vi / en / zh / x-default), Open Graph. robots: trang lọc sâu (> 2 tham số) hoặc biến thể giá / cho
// tặng / sắp xếp / giá nhập tay (?price=, ?free=, ?sort=, ?price_min=, ?price_max= của mini-app) → noindex.
// Trang con mini-app (/pass-do/bo-loc, /da-luu, /tin-nhan, /quan-ly): miniAppMetadata — tiêu đề + canonical, luôn noindex
// (trang tiện ích / riêng tư, không có nội dung tin riêng). /quan-ly/[id]/sua, /tin-nhan/[id]: miniAppPrivateMetadata.
// Toàn site đang noindex ở layout gốc tới khi ra mắt (tuần 11) — trang không ghi đè thành index.
import type { PublicListing } from '@hp/core';
import { APP_NAME, type ListingFeature, priceLabel } from '@hp/shared';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { absoluteUrl, localeAlternates } from '@/i18n/alternates';
import { listingImageUrl } from '@/lib/images';
import { asLocale, priceText } from './display';
import { activeFilterCount, filterQuery, hasCustomPrice, parseListFilters } from './filters';
import { LISTING_FEATURE_CONFIGS } from './features';
import { getPublicSites } from './queries';
import { type ListScope, scopeInfo } from './scope';

type RawParams = Record<string, string | string[] | undefined>;

const withQuery = (path: string, query: Record<string, string>) => {
  const qs = new URLSearchParams(query).toString();
  return qs ? `${path}?${qs}` : path;
};

export async function listMetadata(scope: ListScope, searchParams: Promise<RawParams>): Promise<Metadata> {
  const { path, categories, seoKey, filterOptions } = scopeInfo(scope);
  const locale = asLocale(await getLocale());
  const t = await getTranslations();
  // Cùng bộ lọc tính năng với trang để ?price_max= / ?price= / ?free= / ?sort= được nhận đúng như trang.
  const filters = parseListFilters(await searchParams, categories, filterOptions);
  const siteName = filters.site ? (await getPublicSites()).find((s) => s.code === filters.site)?.name : undefined;

  const title = siteName
    ? t(`web.listing.${seoKey}.heading_site`, { site: siteName })
    : t(`web.listing.${seoKey}.title`);
  const description = t(`web.listing.${seoKey}.description`);
  // Canonical giữ category + khu (trang có nội dung riêng), bỏ từ khoá tìm kiếm, giá, cho tặng, thứ tự.
  const canonicalPath = withQuery(path, filterQuery({ category: filters.category, site: siteName ? filters.site : null }));
  // Biến thể giá / cho tặng / thứ tự: cùng nội dung với trang gốc sắp lại → không index (canonical về trang gốc).
  const variant =
    filters.sort !== 'newest' || filters.priceRange !== null || filters.freeOnly || hasCustomPrice(filters, filterOptions);

  return {
    title,
    description,
    alternates: localeAlternates(canonicalPath, locale),
    openGraph: { type: 'website', siteName: APP_NAME, title, description, url: absoluteUrl(canonicalPath, locale), locale },
    twitter: { card: 'summary' },
    // Lọc sâu (> 2 tham số) và trang kết quả tìm kiếm có từ khoá: noindex (trang mỏng, vô hạn biến thể).
    ...(activeFilterCount(filters) > 2 || variant || (scope === 'search' && filters.query) ? { robots: { index: false, follow: true } } : {}),
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

/** Tiêu đề từng trang con của mini-app. */
const MINI_APP_PAGE_TITLE = {
  filter: 'listing.mini_app.filter.title',
  saved: 'listing.mini_app.saved.title',
  chat: 'listing.mini_app.tabs.chat',
  manage: 'listing.mini_app.manage.title',
  post: 'listing.form.title_new',
} as const;

/** Trang con của mini-app: "{trang} – {tên mini-app}" + canonical (không tham số), noindex. */
export async function miniAppMetadata(feature: ListingFeature, page: keyof typeof MINI_APP_PAGE_TITLE): Promise<Metadata> {
  const cfg = LISTING_FEATURE_CONFIGS[feature];
  if (!cfg.miniApp) return { robots: { index: false, follow: true } };
  const locale = asLocale(await getLocale());
  const t = await getTranslations();
  const path = cfg.miniApp.paths[page];
  return {
    title: `${t(MINI_APP_PAGE_TITLE[page])} – ${t(cfg.miniApp.titleKey)}`,
    alternates: localeAlternates(path, locale),
    robots: { index: false, follow: true },
  };
}

/** Trang riêng theo id trong mini-app (sửa tin, khung chat): "{trang} – {tên mini-app}", không canonical, noindex nofollow. */
export async function miniAppPrivateMetadata(feature: ListingFeature, page: 'edit' | 'thread'): Promise<Metadata> {
  const cfg = LISTING_FEATURE_CONFIGS[feature];
  const t = await getTranslations();
  const pageTitle = t(page === 'edit' ? 'listing.form.title_edit' : 'chat.title');
  return {
    title: cfg.miniApp ? `${pageTitle} – ${t(cfg.miniApp.titleKey)}` : pageTitle,
    robots: { index: false, follow: false },
  };
}
