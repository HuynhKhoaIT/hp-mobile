// Phạm vi một trang danh sách: một tính năng (/pass-do, /tro, /viec-lam, /that-lac), tất cả (/tin) hoặc tìm kiếm
// (/tim-kiem — cùng engine với /tin, chỉ khác đường dẫn + chữ SEO; ô tìm ở header gửi ?q= tới đây).
import { LISTING_CATEGORIES, type ListingCategory, type ListingFeature } from '@hp/shared';
import { LISTING_FEATURE_CONFIGS } from './features';
import { filterOptionsOf, type ListFilterOptions } from './filters';

export type ListScope = ListingFeature | 'all' | 'search';

export function scopeInfo(scope: ListScope): {
  feature: ListingFeature | null;
  path: string;
  categories: readonly ListingCategory[];
  /** Khoá SEO trong web.listing.<key>.{title,description,heading_site}. */
  seoKey: ListScope;
  /** /tin trộn nhiều tính năng → lưới. */
  cardLayout: 'grid' | 'row';
  /** Lựa chọn km của bộ lọc khoảng cách (rỗng = không có). */
  distanceKm: readonly number[];
  /** Bộ lọc tính năng cho phép (khoảng cách, giá, sắp xếp, cho tặng) — parseListFilters / searchFiltersOf. */
  filterOptions: ListFilterOptions;
} {
  if (scope === 'all') {
    return { feature: null, path: '/tin', categories: LISTING_CATEGORIES, seoKey: 'all', cardLayout: 'grid', distanceKm: [], filterOptions: {} };
  }
  if (scope === 'search') {
    return { feature: null, path: '/tim-kiem', categories: LISTING_CATEGORIES, seoKey: 'search', cardLayout: 'grid', distanceKm: [], filterOptions: {} };
  }
  const cfg = LISTING_FEATURE_CONFIGS[scope];
  return {
    feature: scope,
    path: cfg.path,
    categories: cfg.categories,
    seoKey: scope,
    cardLayout: cfg.cardLayout,
    distanceKm: cfg.distanceFilterKm ?? [],
    filterOptions: filterOptionsOf(cfg),
  };
}
