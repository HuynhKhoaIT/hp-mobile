// Zod cho tin đăng: attributes theo category (hợp đồng với listings.attributes) + bộ lọc danh sách.
// Schema attributes sinh từ ATTRIBUTE_FIELDS (fields.ts) để Zod, trang chi tiết và form không lệch nhau.
import { z } from 'zod';
import { LISTING_CATEGORIES } from '../../enums';
import { SiteCode } from '../profile';

export * from './fields';
export * from './attributes';
export * from './input';
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

