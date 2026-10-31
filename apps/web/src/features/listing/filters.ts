// Bộ lọc danh sách trên URL: ?category=<mã>&q=<từ khoá>&site=<mã khu>&<thuộc tính>=<giá trị>. Kiểm bằng ListingFilters
// (@hp/shared); giá trị sai / không thuộc tính năng → bỏ qua (không báo lỗi, không 404). Không phụ thuộc React — dùng ở
// server và client.
// Thuộc tính (chip "Tìm nhanh" của trang chủ — HOME_SHORTCUTS): chỉ trường enum / bool của ATTRIBUTE_FIELDS thuộc các
// category đang xét mới được nhận (whitelist), tên tham số = khoá thuộc tính (`?vehicle_type=motorbike`, `?has_loft=1`,
// `?shift=night`). Gửi xuống search_listings dạng jsonb containment (p_attributes).
import { ATTRIBUTE_FIELDS, type AttributeField, type ListingCategory, ListingFilters } from '@hp/shared';

/** Thuộc tính đang lọc: enum → mã giá trị, bool → true / false. */
export type AttributeFilter = Readonly<Record<string, string | boolean>>;

export type ListFilterState = {
  /** Category đang chọn (một chip) hoặc null = tất cả category của tính năng. */
  category: ListingCategory | null;
  query: string;
  site: string | null;
  attributes: AttributeFilter;
};

type RawParams = Record<string, string | string[] | undefined>;
type FilterableField = Extract<AttributeField, { kind: 'enum' | 'bool' }>;

/** Tham số đã dùng cho bộ lọc chung — thuộc tính không được trùng tên. */
const RESERVED = new Set(['category', 'q', 'site', 'tab', 'next']);

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

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

export function parseListFilters(raw: RawParams, allowed: readonly ListingCategory[]): ListFilterState {
  const rawCategory = first(raw.category);
  const category =
    rawCategory && ListingFilters.safeParse({ categories: [rawCategory] }).success && allowed.includes(rawCategory as ListingCategory)
      ? (rawCategory as ListingCategory)
      : null;
  const q = ListingFilters.safeParse({ query: first(raw.q) ?? '' });
  const s = ListingFilters.safeParse({ site: first(raw.site) });

  const attributes: Record<string, string | boolean> = {};
  for (const field of filterableFields(category ? [category] : allowed)) {
    const value = parseAttributeValue(field, first(raw[field.key]));
    if (value !== undefined) attributes[field.key] = value;
  }

  return {
    category,
    query: q.success ? (q.data.query ?? '') : '',
    site: s.success ? (s.data.site ?? null) : null,
    attributes,
  };
}

/** Số tham số lọc đang dùng (robots noindex khi > 2 — .claude/rules/web-seo-public.md). */
export function activeFilterCount(f: ListFilterState): number {
  return [f.category, f.query, f.site].filter(Boolean).length + Object.keys(f.attributes).length;
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
  return { ...out, ...attributeQuery(f.attributes) };
}
