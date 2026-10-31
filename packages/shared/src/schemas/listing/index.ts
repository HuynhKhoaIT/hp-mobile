// Zod cho tin đăng: attributes theo category (hợp đồng với listings.attributes) + bộ lọc danh sách.
// Schema attributes sinh từ ATTRIBUTE_FIELDS (fields.ts) để Zod, trang chi tiết và form không lệch nhau.
import { z } from 'zod';
import { LISTING_CATEGORIES, type ListingCategory } from '../../enums';
import { SiteCode } from '../profile';
import { ATTRIBUTE_FIELDS, type AttributeField } from './fields';

export * from './fields';

function fieldSchema(field: AttributeField): z.ZodType {
  switch (field.kind) {
    case 'enum':
      return z.enum(field.options as [string, ...string[]]);
    case 'int':
      return z.number().int().min(0).max(field.unit === 'year' ? 2100 : 10_000_000);
    case 'money':
      return z.number().int().min(0).max(100_000_000_000);
    case 'bool':
      return z.boolean();
    case 'text':
      return z.string().trim().max(200, 'too_long');
    case 'datetime':
      return z.iso.datetime({ offset: true });
  }
}

function attributesSchema(fields: readonly AttributeField[]) {
  return z
    .object(Object.fromEntries(fields.map((f) => [f.key, fieldSchema(f).optional()])))
    .strict();
}

/** Zod `attributes` theo category — dùng khi đăng / sửa tin (tuần 4) và ở moderate-listing. */
export const ListingAttributes = Object.fromEntries(
  LISTING_CATEGORIES.map((c) => [c, attributesSchema(ATTRIBUTE_FIELDS[c])]),
) as Record<ListingCategory, ReturnType<typeof attributesSchema>>;

export type AttributeValue = string | number | boolean;

/**
 * Đọc attributes để hiển thị: giữ trường hợp lệ theo ATTRIBUTE_FIELDS, bỏ qua trường lạ / sai kiểu
 * (dữ liệu cũ không làm vỡ trang chi tiết). Trả theo đúng thứ tự khai báo.
 */
export function readAttributes(
  category: ListingCategory,
  raw: unknown,
): { field: AttributeField; value: AttributeValue }[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const obj = raw as Record<string, unknown>;
  const out: { field: AttributeField; value: AttributeValue }[] = [];
  for (const field of ATTRIBUTE_FIELDS[category]) {
    const parsed = fieldSchema(field).safeParse(obj[field.key]);
    if (!parsed.success) continue;
    const value = parsed.data as AttributeValue;
    if (value === '') continue;
    out.push({ field, value });
  }
  return out;
}

/** Bộ lọc danh sách / tìm kiếm (search params web, state bộ lọc app). Khớp tham số RPC search_listings. */
export const ListingFilters = z
  .object({
    categories: z.array(z.enum(LISTING_CATEGORIES)).max(LISTING_CATEGORIES.length),
    query: z.string().trim().max(100, 'too_long'),
    site: SiteCode,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusM: z.number().int().min(100).max(50_000),
    priceMin: z.number().int().min(0),
    priceMax: z.number().int().min(0),
    attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  })
  .partial()
  .strict();
export type ListingFilters = z.infer<typeof ListingFilters>;

