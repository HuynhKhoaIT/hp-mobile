// Quy tắc hiển thị tin dùng chung app và web (card + chi tiết giống nhau). Trả mô tả dữ liệu, không trả chữ:
// client tự dịch (t) và định dạng tiền (formatMoney) theo locale.
// Chỉ import type: file được node --test chạy trực tiếp (không phân giải import thiếu đuôi).
import type { ListingCategory, ListingFeature } from './enums';

export type PricePer = 'month' | 'hour' | 'day';
export type PriceLabel =
  | { type: 'free' }
  | { type: 'negotiable' }
  | { type: 'money'; amount: number; per?: PricePer }
  | { type: 'range'; min: number; max: number | null; per?: PricePer };

type PriceSource = {
  category: ListingCategory;
  price: number | null;
  price_type: string;
  attributes: unknown;
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

/**
 * Giá hiển thị: việc làm lấy khoảng lương trong attributes (salary_min / max theo pay_type); trọ tính theo tháng;
 * đồ thất lạc không có giá; miễn phí / thoả thuận hiện chữ.
 */
export function priceLabel(l: PriceSource): PriceLabel {
  const attrs = (l.attributes && typeof l.attributes === 'object' ? l.attributes : {}) as Record<string, unknown>;
  const feature = featureOfCategory(l.category);

  if (feature === 'job') {
    const min = num(attrs.salary_min);
    const max = num(attrs.salary_max);
    const per = (['hour', 'day', 'month'] as const).find((p) => p === attrs.pay_type);
    if (min !== null) return { type: 'range', min, max: max !== null && max > min ? max : null, per };
    if (l.price !== null && l.price > 0) return { type: 'money', amount: l.price, per };
    return { type: 'negotiable' };
  }
  if (feature === 'lostFound') return { type: 'free' };
  if (l.price_type === 'free') return { type: 'free' };
  if (l.price === null || l.price_type === 'negotiable') return { type: 'negotiable' };
  return { type: 'money', amount: l.price, per: feature === 'room' ? 'month' : undefined };
}

/** Tính năng chứa category (pass / room / job / lostFound) — khớp LISTING_FEATURES trong enums.ts. */
export function featureOfCategory(category: ListingCategory): ListingFeature {
  if (category === 'lost' || category === 'found') return 'lostFound';
  if (category.startsWith('room_')) return 'room';
  if (category.startsWith('job_')) return 'job';
  return 'pass';
}
