// Sắp xếp + khoảng giá đặt sẵn cho bộ lọc danh sách (RPC search_listings p_sort / p_price_min / p_price_max).

/** Thứ tự danh sách — RPC search_listings p_sort. Nhãn i18n `listing.sort.<code>`. */
export const LISTING_SORTS = ['newest', 'price_asc', 'price_desc'] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

/**
 * Khoảng giá đặt sẵn (VND) cho bộ lọc "Giá" của Pass đồ — app chọn trong sheet, web dùng `?price=<key>` (tập hữu hạn để
 * trang danh sách còn cache được). Nhãn i18n `listing.price_range.<key>`. `min` / `max` → priceMin / priceMax.
 */
export const PASS_PRICE_RANGES = [
  { key: 'under_500k', max: 500_000 },
  { key: '500k_2m', min: 500_000, max: 2_000_000 },
  { key: '2m_5m', min: 2_000_000, max: 5_000_000 },
  { key: 'over_5m', min: 5_000_000 },
] as const satisfies readonly { key: string; min?: number; max?: number }[];

/** Khoảng giá thuê trọ (VND / tháng) — bộ lọc "Giá" của mini-app Nhà trọ. Nhãn i18n `listing.price_range.<key>`. */
export const ROOM_PRICE_RANGES = [
  { key: 'under_1m', max: 1_000_000 },
  { key: '1m_2m', min: 1_000_000, max: 2_000_000 },
  { key: '2m_3m', min: 2_000_000, max: 3_000_000 },
  { key: 'over_3m', min: 3_000_000 },
] as const satisfies readonly { key: string; min?: number; max?: number }[];

export type ListingPriceRange = (typeof PASS_PRICE_RANGES)[number] | (typeof ROOM_PRICE_RANGES)[number];
