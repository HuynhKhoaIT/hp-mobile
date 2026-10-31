// Bộ lọc danh sách trên URL: ?category=<mã>&q=<từ khoá>&site=<mã khu>. Kiểm bằng ListingFilters (@hp/shared);
// giá trị sai / không thuộc tính năng → bỏ qua (không báo lỗi, không 404). Không phụ thuộc React — dùng ở server và client.
import { type ListingCategory, ListingFilters } from '@hp/shared';

export type ListFilterState = {
  /** Category đang chọn (một chip) hoặc null = tất cả category của tính năng. */
  category: ListingCategory | null;
  query: string;
  site: string | null;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseListFilters(raw: RawParams, allowed: readonly ListingCategory[]): ListFilterState {
  const rawCategory = first(raw.category);
  const category =
    rawCategory && ListingFilters.safeParse({ categories: [rawCategory] }).success && allowed.includes(rawCategory as ListingCategory)
      ? (rawCategory as ListingCategory)
      : null;
  const q = ListingFilters.safeParse({ query: first(raw.q) ?? '' });
  const s = ListingFilters.safeParse({ site: first(raw.site) });
  return {
    category,
    query: q.success ? (q.data.query ?? '') : '',
    site: s.success ? (s.data.site ?? null) : null,
  };
}

/** Số tham số lọc đang dùng (robots noindex khi > 2 — .claude/rules/web-seo-public.md). */
export function activeFilterCount(f: ListFilterState): number {
  return [f.category, f.query, f.site].filter(Boolean).length;
}

/** Query string cho Link / canonical (bỏ trường rỗng). */
export function filterQuery(f: Partial<ListFilterState>): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.category) out.category = f.category;
  if (f.query) out.q = f.query;
  if (f.site) out.site = f.site;
  return out;
}
