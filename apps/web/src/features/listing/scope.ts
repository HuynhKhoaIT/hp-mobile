// Phạm vi một trang danh sách: một tính năng (/pass-do, /tro, /viec-lam, /that-lac) hoặc tất cả (/tin).
import { LISTING_CATEGORIES, type ListingCategory, type ListingFeature } from '@hp/shared';
import { LISTING_FEATURE_CONFIGS } from './features';

export type ListScope = ListingFeature | 'all';

export function scopeInfo(scope: ListScope): {
  feature: ListingFeature | null;
  path: string;
  categories: readonly ListingCategory[];
  /** Khoá SEO trong web.listing.<key>.{title,description,heading_site}. */
  seoKey: ListScope;
  /** /tin trộn nhiều tính năng → lưới. */
  cardLayout: 'grid' | 'row';
} {
  if (scope === 'all') return { feature: null, path: '/tin', categories: LISTING_CATEGORIES, seoKey: 'all', cardLayout: 'grid' };
  const cfg = LISTING_FEATURE_CONFIGS[scope];
  return { feature: scope, path: cfg.path, categories: cfg.categories, seoKey: scope, cardLayout: cfg.cardLayout };
}
