// Bộ lọc danh sách trên URL: ?category=<mã>&q=<từ khoá>&site=<mã khu>&distance=<km>&price_max=<VND>&price=<khoảng>&free=1
// &sort=<thứ tự>&<thuộc tính>=<giá trị>. Kiểm bằng ListingFilters
// (@hp/shared); giá trị sai / không thuộc tính năng → bỏ qua (không báo lỗi, không 404). Không phụ thuộc React — dùng ở
// server và client.
// Thuộc tính (chip "Tìm nhanh" của trang chủ — HOME_SHORTCUTS): chỉ trường enum / bool của ATTRIBUTE_FIELDS thuộc các
// category đang xét mới được nhận (whitelist), tên tham số = khoá thuộc tính (`?vehicle_type=motorbike`, `?has_loft=1`,
// `?shift=night`). Gửi xuống search_listings dạng jsonb containment (p_attributes).
// Khoảng cách tới khu làm việc (`?distance=2` = dưới 2 km): chỉ nhận giá trị trong `distanceFilterKm` của config tính năng
// (trọ: 1 / 2 / 5) → search_listings p_max_distance_m. Tập giá trị hữu hạn → trang đầu vẫn cache được.
// Giá tối đa (`?price_max=1000000` = dưới 1 triệu): chỉ nhận mốc của chip lọc nhanh giá trong config (`priceMaxOptions`)
// → search_listings p_price_max. Cũng là tập hữu hạn → cache được.
// Pass đồ (config.priceRanges / sortable / chip freeOnly): `?price=500k_2m` (khoá khoảng giá → p_price_min / p_price_max),
// `?sort=price_asc|price_desc` (mặc định newest — không ghi lên URL), `?free=1` (chỉ tin cho tặng → p_free_only). Đều là tập
// hữu hạn → cache được; tính năng không khai báo thì tham số bị bỏ qua.
import {
  ATTRIBUTE_FIELDS,
  type AttributeField,
  type ListingCategory,
  ListingFilters,
  LISTING_SORTS,
  type ListingSort,
} from '@hp/shared';
import type { ListingFeatureConfig, ListingQuickFilter } from './feature-config';

/** Thuộc tính đang lọc: enum → mã giá trị, bool → true / false. */
export type AttributeFilter = Readonly<Record<string, string | boolean>>;

export type ListFilterState = {
  /** Category đang chọn (một chip) hoặc null = tất cả category của tính năng. */
  category: ListingCategory | null;
  query: string;
  site: string | null;
  /** Cách khu làm việc tối đa (km) — null = mọi khoảng cách. */
  distanceKm: number | null;
  /** Giá tối đa (VND) — null = mọi mức giá. */
  priceMax: number | null;
  /** Khoá khoảng giá đặt sẵn (config.priceRanges) — null = mọi mức giá. */
  priceRange: string | null;
  /** Chỉ tin cho tặng. */
  freeOnly: boolean;
  /** Thứ tự — 'newest' là mặc định (không ghi lên URL). */
  sort: ListingSort;
  attributes: AttributeFilter;
};

/** Khoảng giá đặt sẵn (PASS_PRICE_RANGES của @hp/shared) — dạng rộng để đọc min / max. */
export type PriceRange = { key: string; min?: number; max?: number };

/** Các bộ lọc tính năng cho phép (từ config) — tham số ngoài danh sách bị bỏ qua. */
export type ListFilterOptions = {
  /** Lựa chọn km của bộ lọc khoảng cách (config.distanceFilterKm). */
  distanceKm?: readonly number[];
  /** Mốc giá tối đa (chip lọc nhanh giá). */
  priceMax?: readonly number[];
  /** Khoảng giá đặt sẵn (config.priceRanges). */
  priceRanges?: readonly PriceRange[];
  /** Có ô sắp xếp (config.sortable). */
  sortable?: boolean;
  /** Có chip "Cho tặng" (chip freeOnly trong config.quickFilters). */
  freeOnly?: boolean;
};

export const NO_FILTERS: ListFilterState = {
  category: null,
  query: '',
  site: null,
  distanceKm: null,
  priceMax: null,
  priceRange: null,
  freeOnly: false,
  sort: 'newest',
  attributes: {},
};

type RawParams = Record<string, string | string[] | undefined>;
type FilterableField = Extract<AttributeField, { kind: 'enum' | 'bool' }>;

/** Tham số đã dùng cho bộ lọc chung — thuộc tính không được trùng tên. */
const RESERVED = new Set(['category', 'q', 'site', 'distance', 'price_max', 'price', 'free', 'sort', 'tab', 'next']);

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Chip lọc nhanh theo giá tối đa. */
export const isPriceQuickFilter = (f: ListingQuickFilter): f is Extract<ListingQuickFilter, { priceMax: number }> => 'priceMax' in f;
/** Chip "Cho tặng". */
export const isFreeQuickFilter = (f: ListingQuickFilter): f is Extract<ListingQuickFilter, { freeOnly: true }> => 'freeOnly' in f;
/** Chip lọc nhanh theo thông số. */
export const isAttributeQuickFilter = (f: ListingQuickFilter): f is Extract<ListingQuickFilter, { key: string }> => 'key' in f;

/** Mốc giá tối đa hợp lệ của tính năng (từ chip lọc nhanh giá trong config). */
export function priceMaxOptions(quick: readonly ListingQuickFilter[] | undefined): number[] {
  return (quick ?? []).filter(isPriceQuickFilter).map((f) => f.priceMax);
}

/** Bộ lọc tính năng cho phép theo config (null = /tin, /tim-kiem: không có khoảng cách / giá / sắp xếp / cho tặng). */
export function filterOptionsOf(cfg: ListingFeatureConfig | null): ListFilterOptions {
  if (!cfg) return {};
  return {
    distanceKm: cfg.distanceFilterKm ?? [],
    priceMax: priceMaxOptions(cfg.quickFilters),
    priceRanges: cfg.priceRanges ?? [],
    sortable: cfg.sortable ?? false,
    freeOnly: (cfg.quickFilters ?? []).some(isFreeQuickFilter),
  };
}

/** Trường lọc được (enum / bool) của các category. Cùng khoá ở nhiều category (item_type) → gộp các lựa chọn. */
export function filterableFields(categories: readonly ListingCategory[]): FilterableField[] {
  const byKey = new Map<string, FilterableField>();
  for (const c of categories) {
    for (const field of ATTRIBUTE_FIELDS[c]) {
      if ((field.kind !== 'enum' && field.kind !== 'bool') || RESERVED.has(field.key)) continue;
      const prev = byKey.get(field.key);
      if (prev?.kind === 'enum' && field.kind === 'enum') {
        byKey.set(field.key, { ...prev, options: [...new Set([...prev.options, ...field.options])] });
      } else if (!prev) {
        byKey.set(field.key, field);
      }
    }
  }
  return [...byKey.values()];
}

function parseAttributeValue(field: FilterableField, raw: string | undefined): string | boolean | undefined {
  if (raw === undefined) return undefined;
  if (field.kind === 'bool') return raw === '1' || raw === 'true' ? true : raw === '0' || raw === 'false' ? false : undefined;
  return field.options.includes(raw) ? raw : undefined;
}

/** Giữ thuộc tính còn hợp lệ với các category (đổi chip category: `shift` còn đúng cho cả 2 loại việc, `has_loft` thì không). */
export function attributesFor(attributes: AttributeFilter, categories: readonly ListingCategory[]): AttributeFilter {
  const out: Record<string, string | boolean> = {};
  for (const field of filterableFields(categories)) {
    const value = attributes[field.key];
    if (value === undefined) continue;
    const parsed = parseAttributeValue(field, typeof value === 'boolean' ? (value ? '1' : '0') : value);
    if (parsed !== undefined) out[field.key] = parsed;
  }
  return out;
}

/** km → mét cho search_listings (ListingFilters.maxDistanceM). */
export const distanceMeters = (km: number | null): number | undefined => (km === null ? undefined : km * 1000);

export function parseListFilters(
  raw: RawParams,
  allowed: readonly ListingCategory[],
  /** Bộ lọc tính năng cho phép (filterOptionsOf(config)); thiếu = chỉ danh mục / từ khoá / khu / thuộc tính. */
  options: ListFilterOptions = {},
): ListFilterState {
  const rawCategory = first(raw.category);
  const category =
    rawCategory && ListingFilters.safeParse({ categories: [rawCategory] }).success && allowed.includes(rawCategory as ListingCategory)
      ? (rawCategory as ListingCategory)
      : null;
  const q = ListingFilters.safeParse({ query: first(raw.q) ?? '' });
  const s = ListingFilters.safeParse({ site: first(raw.site) });
  const rawDistance = Number(first(raw.distance));
  const distanceKm =
    (options.distanceKm ?? []).includes(rawDistance) && ListingFilters.safeParse({ maxDistanceM: rawDistance * 1000 }).success
      ? rawDistance
      : null;
  const rawPrice = Number(first(raw.price_max));
  const priceMax =
    (options.priceMax ?? []).includes(rawPrice) && ListingFilters.safeParse({ priceMax: rawPrice }).success ? rawPrice : null;
  const rawRange = first(raw.price);
  const priceRange = (options.priceRanges ?? []).find((r) => r.key === rawRange)?.key ?? null;
  const rawSort = first(raw.sort);
  const sort: ListingSort =
    options.sortable && rawSort && (LISTING_SORTS as readonly string[]).includes(rawSort) ? (rawSort as ListingSort) : 'newest';
  const rawFree = first(raw.free);
  const freeOnly = !!options.freeOnly && (rawFree === '1' || rawFree === 'true');

  const attributes: Record<string, string | boolean> = {};
  for (const field of filterableFields(category ? [category] : allowed)) {
    const value = parseAttributeValue(field, first(raw[field.key]));
    if (value !== undefined) attributes[field.key] = value;
  }

  return {
    category,
    query: q.success ? (q.data.query ?? '') : '',
    site: s.success ? (s.data.site ?? null) : null,
    distanceKm,
    priceMax,
    priceRange,
    freeOnly,
    sort,
    attributes,
  };
}

/** Số tham số lọc đang dùng (robots noindex khi > 2 — .claude/rules/web-seo-public.md). Sắp xếp không tính (xem isFiltered). */
export function activeFilterCount(f: ListFilterState): number {
  return (
    [f.category, f.query, f.site, f.distanceKm, f.priceMax, f.priceRange, f.freeOnly].filter(Boolean).length +
    Object.keys(f.attributes).length
  );
}

/** Đang lọc hoặc sắp xếp khác mặc định → danh sách thường (không trang chủ mini), hiện "Xoá lọc". */
export const isFiltered = (f: ListFilterState): boolean => activeFilterCount(f) > 0 || f.sort !== 'newest';

/**
 * Phần lọc gửi xuống search_listings (ngoài danh mục / từ khoá / khu): khoảng cách, giá (khoảng giá + mốc giá tối đa — lấy
 * mức chặt hơn), cho tặng, thứ tự. Dùng chung cho trang đầu (server) và "Xem thêm" (client) để cursor khớp bộ lọc.
 */
export function searchFiltersOf(
  f: ListFilterState,
  options: ListFilterOptions,
): { maxDistanceM?: number; priceMin?: number; priceMax?: number; freeOnly?: boolean; sort?: ListingSort } {
  const range = (options.priceRanges ?? []).find((r) => r.key === f.priceRange);
  const maxes = [range?.max, f.priceMax ?? undefined].filter((v): v is number => v !== undefined);
  return {
    maxDistanceM: distanceMeters(f.distanceKm),
    priceMin: range?.min,
    priceMax: maxes.length > 0 ? Math.min(...maxes) : undefined,
    freeOnly: f.freeOnly || undefined,
    sort: f.sort === 'newest' ? undefined : f.sort,
  };
}

/** Thuộc tính → tham số URL (bool: 1 / 0). Thứ tự khoá cố định để URL / khoá cache ổn định. */
export function attributeQuery(attributes: AttributeFilter | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(attributes ?? {}).sort()) {
    const value = attributes?.[key];
    if (value === undefined) continue;
    out[key] = typeof value === 'boolean' ? (value ? '1' : '0') : value;
  }
  return out;
}

/** Query string cho Link / canonical (bỏ trường rỗng; sắp xếp mặc định không ghi). */
export function filterQuery(f: Partial<ListFilterState>): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.category) out.category = f.category;
  if (f.query) out.q = f.query;
  if (f.site) out.site = f.site;
  if (f.distanceKm) out.distance = String(f.distanceKm);
  if (f.priceMax) out.price_max = String(f.priceMax);
  if (f.priceRange) out.price = f.priceRange;
  if (f.freeOnly) out.free = '1';
  if (f.sort && f.sort !== 'newest') out.sort = f.sort;
  return { ...out, ...attributeQuery(f.attributes) };
}
