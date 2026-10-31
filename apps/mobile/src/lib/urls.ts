// Link trang web (pháp lý, chia sẻ) theo ngôn ngữ đang dùng: vi không tiền tố, /en, /zh — khớp routing của web.
// routeForWebPath: đường dẫn web nội bộ (link banner…) → route của app.
import { LISTING_FEATURE_PATHS, shareUrl } from '@hp/core';
import type { ListingFeature } from '@hp/shared';
import type { Href } from 'expo-router';
import { LISTING_ROUTE_SLUG } from '@/features/listing/navigation';
import { getLocale } from '@/core/i18n';
import { env } from '@/core/env';

/** Link chia sẻ tin: luôn URL web `https://tenapp.vn/tin/{slug}` (không tiền tố ngôn ngữ, không scheme hoaphat://). */
export function listingShareUrl(slug: string): string {
  return shareUrl({ type: 'listing', slug }, env.webUrl);
}

export type WebPage = '/dieu-khoan' | '/chinh-sach-bao-mat' | '/xoa-tai-khoan' | '/gioi-thieu' | '/lien-he';

export function webPageUrl(page: WebPage): string {
  const locale = getLocale();
  return `${env.webUrl}${locale === 'vi' ? '' : `/${locale}`}${page}`;
}

/** Trang web có màn tương ứng trong app: `href` cho router; `auth` = cần đăng nhập trước (requireAuth). */
export type AppRoute = { href: Href; auth: boolean };

const LOCALE_PREFIX = /^\/(en|zh)(?=\/|$)/;

/**
 * Đường dẫn web nội bộ (link banner, link trong nội dung: `/pass-do`, `/dang-tin`, `/tin/{slug}`, `/tim-kiem?q=`…)
 * → route của app. Bỏ tiền tố ngôn ngữ `/en`, `/zh`. Không có màn tương ứng (trang pháp lý, nhóm…) → null
 * (nơi gọi mở trang web). Khớp đường dẫn cố định của web (LISTING_FEATURE_PATHS, apps/web/app/[locale]).
 */
export function routeForWebPath(input: string): AppRoute | null {
  const [rawPath = '/', rawQuery = ''] = input.split('#')[0]?.split('?') ?? [];
  const path = (rawPath.replace(LOCALE_PREFIX, '') || '/').replace(/\/+$/, '') || '/';
  const query = new URLSearchParams(rawQuery);
  const site = query.get('site') ?? undefined;
  const q = query.get('q') ?? undefined;
  // Web lọc một category bằng `?category=` (apps/web features/listing/filters.ts) → params `categories` của màn List.
  const category = query.get('category') ?? undefined;
  const listParams = { ...(site ? { site } : {}), ...(category ? { categories: category } : {}) };

  if (path === '/') return { href: '/', auth: false };
  if (path === '/tin') return { href: { pathname: '/listings/[feature]', params: { feature: 'all', ...listParams } }, auth: false };
  const feature = (Object.keys(LISTING_FEATURE_PATHS) as ListingFeature[]).find((f) => LISTING_FEATURE_PATHS[f] === path);
  if (feature) {
    return { href: { pathname: '/listings/[feature]', params: { feature: LISTING_ROUTE_SLUG[feature], ...listParams } }, auth: false };
  }
  const slug = /^\/tin\/([^/]+)$/.exec(path)?.[1];
  if (slug) return { href: { pathname: '/tin/[slug]', params: { slug: decodeURIComponent(slug) } }, auth: false };

  switch (path) {
    case '/ghep-xe':
      return { href: { pathname: '/groups/[kind]', params: { kind: 'ride' } }, auth: false };
    case '/ghep-tran':
      return { href: { pathname: '/groups/[kind]', params: { kind: 'sport' } }, auth: false };
    case '/dang-tin':
      return { href: '/listing/new', auth: true };
    case '/tim-kiem':
      return { href: { pathname: '/search', params: q ? { q } : {} }, auth: false };
    case '/toi':
      return { href: '/me', auth: false };
    case '/toi/tin-cua-toi':
      return { href: '/my-listings', auth: true };
    case '/toi/da-luu':
      return { href: '/saved', auth: true };
    case '/thong-bao':
      return { href: '/notifications', auth: true };
    case '/tin-nhan':
      return { href: '/chat', auth: false };
    default:
      return null;
  }
}

/** URL đầy đủ của một đường dẫn web (mở bằng trình duyệt khi app không có màn tương ứng). */
export function webUrlForPath(path: string): string {
  return `${env.webUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
