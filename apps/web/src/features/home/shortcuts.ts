// Chip "Tìm nhanh" (docs/design/home.md §4.6): HOME_SHORTCUTS (@hp/shared, chung với app) → link danh sách của tính năng
// với bộ lọc trên URL — `?category=` khi chip nhắm đúng một category, thuộc tính qua tham số whitelist của
// features/listing/filters.ts (`?vehicle_type=motorbike`, `?has_loft=1`, `?shift=night`). Trang danh sách đọc lại bằng
// parseListFilters → searchListings({ attributes }). Chip nhắm nhiều category của cùng tính năng = cả tính năng.
import { HOME_SHORTCUTS, type ListingFeature } from '@hp/shared';
import { LISTING_FEATURE_CONFIGS } from '@/features/listing/features';
import { attributesFor, filterQuery } from '@/features/listing/filters';
import { SERVICE_VISUALS } from './services';

export type ShortcutLink = {
  id: string;
  feature: ListingFeature;
  dot: string;
  href: { pathname: string; query: Record<string, string> };
};

export const HOME_SHORTCUT_LINKS: readonly ShortcutLink[] = HOME_SHORTCUTS.map((s) => {
  const cfg = LISTING_FEATURE_CONFIGS[s.feature];
  const category = s.categories.length === 1 ? (s.categories[0] ?? null) : null;
  const raw = Object.fromEntries(
    Object.entries(s.attributes ?? {}).map(([k, v]) => [k, typeof v === 'number' ? String(v) : v] as const),
  );
  const attributes = attributesFor(raw, category ? [category] : cfg.categories);
  return {
    id: s.id,
    feature: s.feature,
    dot: SERVICE_VISUALS[s.feature].dot,
    href: { pathname: cfg.path, query: filterQuery({ category, attributes }) },
  };
});
