// Chữ hiển thị của tin (giá, thông số) — dùng cho card, chi tiết, metadata, JSON-LD; chạy được cả server lẫn client.
// Quy tắc (giá nào, thông số nào, thứ tự) nằm ở @hp/shared (priceLabel, readAttributes) để app và web giống nhau;
// ở đây chỉ dịch (t) + định dạng (format.ts) theo locale.
import {
  type AttributeField,
  type AttributeValue,
  DEFAULT_LOCALE,
  formatDate,
  formatMoney,
  formatNumber,
  type Locale,
  LOCALES,
  type PriceLabel,
} from '@hp/shared';

/** `useLocale()` / root param trả string → Locale của @hp/shared (lạ → vi). */
export function asLocale(value: string): Locale {
  return (LOCALES as readonly string[]).includes(value) ? (value as Locale) : DEFAULT_LOCALE;
}

/** Hàm dịch tối thiểu (next-intl `t` của server lẫn client đều khớp). */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Giá: miễn phí / thoả thuận / tiền (+ /tháng, /giờ, /ngày) / khoảng lương. */
export function priceText(label: PriceLabel, t: Translate, locale: Locale): string {
  switch (label.type) {
    case 'free':
      return t('common.price.free');
    case 'negotiable':
      return t('common.price.negotiable');
    case 'money': {
      const price = formatMoney(label.amount, locale);
      return label.per ? t(`listing.card.per_${label.per}`, { price }) : price;
    }
    case 'range': {
      const min = formatMoney(label.min, locale);
      const base =
        label.max === null
          ? t('listing.card.salary_from', { min })
          : t('listing.card.salary_range', { min, max: formatMoney(label.max, locale) });
      return label.per ? t(`listing.card.per_${label.per}`, { price: base }) : base;
    }
  }
}

/** Một dòng thông số (readAttributes) → chữ. enum / bool qua attr_value, đơn vị qua listing.unit. */
export function attributeText(field: AttributeField, value: AttributeValue, t: Translate, locale: Locale): string {
  switch (field.kind) {
    case 'enum':
      return t(`listing.attr_value.${field.key}.${String(value)}`);
    case 'bool':
      return t(`listing.attr_value.bool.${value === true ? 'yes' : 'no'}`);
    case 'int': {
      const n = Number(value);
      if (field.unit === 'months' || field.unit === 'people') return t(`listing.unit.${field.unit}`, { count: n });
      // Năm không có dấu phân cách hàng nghìn ("2019", không "2.019").
      if (field.unit === 'year') return t('listing.unit.year', { value: String(n) });
      if (field.unit) return t(`listing.unit.${field.unit}`, { value: formatNumber(n, locale) });
      return formatNumber(n, locale);
    }
    case 'money': {
      const price = formatMoney(Number(value), locale);
      if (field.per === 'kwh') return t('listing.unit.per_kwh', { price });
      return field.per ? t(`listing.card.per_${field.per}`, { price }) : price;
    }
    case 'datetime':
      return formatDate(String(value), locale, 'datetime');
    case 'text':
      return String(value);
  }
}
