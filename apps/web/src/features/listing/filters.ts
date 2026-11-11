// Bộ lọc danh sách trên URL: ?category=<mã>&q=<từ khoá>&site=<mã khu>&distance=<km>&price_max=<VND>&<thuộc tính>=<giá trị>. Kiểm bằng ListingFilters
// (@hp/shared); giá trị sai / không thuộc tính năng → bỏ qua (không báo lỗi, không 404). Không phụ thuộc React — dùng ở
// server và client.
// Thuộc tính (chip "Tìm nhanh" của trang chủ — HOME_SHORTCUTS): chỉ trường enum / bool của ATTRIBUTE_FIELDS thuộc các
// category đang xét mới được nhận (whitelist), tên tham số = khoá thuộc tính (`?vehicle_type=motorbike`, `?has_loft=1`,
// `?shift=night`). Gửi xuống search_listings dạng jsonb containment (p_attributes).
// Khoảng cách tới khu làm việc (`?distance=2` = dưới 2 km): chỉ nhận giá trị trong `distanceFilterKm` của config tính năng
// (trọ: 1 / 2 / 5) → search_listings p_max_distance_m. Tập giá trị hữu hạn → trang đầu vẫn cache được.
// Giá tối đa (`?price_max=1000000` = dưới 1 triệu): chỉ nhận mốc của chip lọc nhanh giá trong config (`priceMaxOptions`)
// → search_listings p_price_max. Cũng là tập hữu hạn → cache được.
import { ATTRIBUTE_FIELDS, type AttributeField, type ListingCategory, ListingFilters } from '@hp/shared';
import type { ListingQuickFilter } from './feature-config';

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
  attributes: AttributeFilter;
};

type RawParams = Record<string, string | string[] | undefined>;
type FilterableField = Extract<AttributeField, { kind: 'enum' | 'bool' }>;

/** Tham số đã dùng cho bộ lọc chung — thuộc tính không được trùng tên. */
const RESERVED = new Set(['category', 'q', 'site', 'distance', 'price_max', 'tab', 'next']);

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Chip lọc nhanh theo giá tối đa — còn lại là chip theo thông số. */
export const isPriceQuickFilter = (f: ListingQuickFilter): f is Extract<ListingQuickFilter, { priceMax: number }> => 'priceMax' in f;

/** Mốc giá tối đa hợp lệ của tính năng (từ chip lọc nhanh giá trong config). */
export function priceMaxOptions(quick: readonly ListingQuickFilter[] | undefined): number[] {
  return (quick ?? []).filter(isPriceQuickFilter).map((f) => f.priceMax);
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
  /** Lựa chọn km của tính năng (config.distanceFilterKm); rỗng = không có bộ lọc khoảng cách. */
  distanceOptions: readonly number[] = [],
  /** Mốc giá tối đa của tính năng (priceMaxOptions); rỗng = không có lọc giá. */
  priceOptions: readonly number[] = [],
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
    distanceOptions.includes(rawDistance) && ListingFilters.safeParse({ maxDistanceM: rawDistance * 1000 }).success ? rawDistance : null;
  const rawPrice = Number(first(raw.price_max));
  const priceMax = priceOptions.includes(rawPrice) && ListingFilters.safeParse({ priceMax: rawPrice }).success ? rawPrice : null;

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
    attributes,
  };
}

/** Số tham số lọc đang dùng (robots noindex khi > 2 — .claude/rules/web-seo-public.md). */
export function activeFilterCount(f: ListFilterState): number {
  return [f.category, f.query, f.site, f.distanceKm, f.priceMax].filter(Boolean).length + Object.keys(f.attributes).length;
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

/** Query string cho Link / canonical (bỏ trường rỗng). */
export function filterQuery(f: Partial<ListFilterState>): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.category) out.category = f.category;
  if (f.query) out.q = f.query;
  if (f.site) out.site = f.site;
  if (f.distanceKm) out.distance = String(f.distanceKm);
  if (f.priceMax) out.price_max = String(f.priceMax);
  return { ...out, ...attributeQuery(f.attributes) };
}
