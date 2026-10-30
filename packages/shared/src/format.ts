// Định dạng tiền / số / ngày / khoảng cách / thời gian tương đối theo locale. Chỉ dùng Intl, không thư viện ngoài.
// App và web gọi qua wrapper của mình (apps/mobile/src/lib/format.ts) với locale hiện tại; không toLocaleString() tự do.

export type FormatLocale = 'vi' | 'en' | 'zh';

const INTL_LOCALE: Record<FormatLocale, string> = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN' };
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

/** 1500000 → vi "1.500.000 ₫" · en "₫1,500,000" · zh "1,500,000越南盾". Tiền luôn VND, không số lẻ. */
export function formatMoney(amount: number, locale: FormatLocale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: 'VND',
    currencyDisplay: locale === 'zh' ? 'name' : 'symbol',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number, locale: FormatLocale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(value);
}

/** Mét → "850 m" dưới 1 km, "1,2 km" (vi) / "1.2 km" (en) từ 1 km. */
export function formatDistance(meters: number, locale: FormatLocale): string {
  if (meters < 1000) {
    const m = Math.max(10, Math.round(meters / 10) * 10);
    return new Intl.NumberFormat(INTL_LOCALE[locale], { style: 'unit', unit: 'meter', unitDisplay: 'short' }).format(m);
  }
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'unit',
    unit: 'kilometer',
    unitDisplay: 'short',
    maximumFractionDigits: meters < 10_000 ? 1 : 0,
  }).format(meters / 1000);
}

export type DateStyle = 'date' | 'time' | 'datetime';

/** Ngày giờ theo giờ Việt Nam (khu liên hợp), bất kể máy người xem ở đâu. */
export function formatDate(input: Date | string | number, locale: FormatLocale, style: DateStyle = 'date'): string {
  const date = input instanceof Date ? input : new Date(input);
  const options: Intl.DateTimeFormatOptions =
    style === 'date' ? { dateStyle: 'medium' } : style === 'time' ? { timeStyle: 'short' } : { dateStyle: 'medium', timeStyle: 'short' };
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { ...options, timeZone: TIME_ZONE }).format(date);
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.345],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
];

/** "5 phút trước" / "5 minutes ago" / "5分钟前"; tương lai "trong 2 giờ". `now` truyền vào để test được. */
export function formatRelative(input: Date | string | number, locale: FormatLocale, now: Date = new Date()): string {
  const date = input instanceof Date ? input : new Date(input);
  let value = (date.getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: 'auto' });
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(value) < size) return rtf.format(Math.round(value), unit);
    value /= size;
  }
  return rtf.format(Math.round(value), 'year');
}
