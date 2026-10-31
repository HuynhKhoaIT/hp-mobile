// Giá trị form "Đăng nhanh" (chuỗi như người dùng gõ) ↔ input CreateListingInput / UpdateListingInput của @hp/shared.
// Không phụ thuộc React: logic thuần để form và kiểm tra dùng chung. Thứ tự bước khớp app (hợp đồng tuần 4):
//   0 chọn tính năng / danh mục → 1 ảnh → 2 thông tin chính (tiêu đề, giá, mô tả) → 3 chi tiết (ATTRIBUTE_FIELDS, khu, địa chỉ, ngôn ngữ).
import type { MyListing } from '@hp/core';
import {
  ATTRIBUTE_FIELDS,
  featureOfCategory,
  type ListingCategory,
  type ListingFeature,
  type Locale,
  LOCALES,
  PRICE_TYPES,
  type PriceType,
} from '@hp/shared';

/** Giá trị thô của thuộc tính: chuỗi (text / enum / số / datetime-local) hoặc boolean (checkbox). */
export type AttrInput = Record<string, string | boolean>;

export type FormValues = {
  title: string;
  description: string;
  price_type: PriceType;
  price: string;
  attributes: AttrInput;
  site: string;
  address_text: string;
  lang: Locale;
};

export type FormStep = 1 | 2 | 3;
export const FORM_STEPS: readonly FormStep[] = [1, 2, 3];

/** Ô giá chỉ có ở pass đồ và trọ (việc làm: lương trong chi tiết; thất lạc: không có giá). */
export function hasPrice(feature: ListingFeature): boolean {
  return feature === 'pass' || feature === 'room';
}

export function emptyValues(defaults: { site: string | null; lang: Locale }): FormValues {
  return {
    title: '',
    description: '',
    price_type: 'fixed',
    price: '',
    attributes: {},
    site: defaults.site ?? '',
    address_text: '',
    lang: defaults.lang,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO → giá trị `<input type="datetime-local">` theo giờ máy người dùng. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `<input type="datetime-local">` (giờ máy) → ISO có múi giờ (Zod z.iso.datetime({ offset: true })). */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** "1.500.000" / "1500000" → 1500000. Rỗng → null. */
export function parseAmount(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

export function valuesFromListing(l: MyListing): FormValues {
  const raw = (l.attributes && typeof l.attributes === 'object' && !Array.isArray(l.attributes) ? l.attributes : {}) as Record<
    string,
    unknown
  >;
  const attributes: AttrInput = {};
  for (const field of ATTRIBUTE_FIELDS[l.category]) {
    const v = raw[field.key];
    if (v === undefined || v === null) continue;
    if (field.kind === 'bool') attributes[field.key] = v === true;
    else if (field.kind === 'datetime') attributes[field.key] = typeof v === 'string' ? isoToLocalInput(v) : '';
    else attributes[field.key] = String(v);
  }
  return {
    title: l.title,
    description: l.description ?? '',
    price_type: (PRICE_TYPES as readonly string[]).includes(l.price_type) ? (l.price_type as PriceType) : 'fixed',
    price: l.price === null ? '' : String(l.price),
    attributes,
    site: l.site ?? '',
    address_text: l.address_text ?? '',
    lang: (LOCALES as readonly string[]).includes(l.lang) ? (l.lang as Locale) : 'vi',
  };
}

/** attributes thô → đúng kiểu theo ATTRIBUTE_FIELDS[category]; ô trống bỏ qua, checkbox chỉ gửi khi bật. */
function cleanAttributes(category: ListingCategory, input: AttrInput): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const field of ATTRIBUTE_FIELDS[category]) {
    const v = input[field.key];
    if (v === undefined || v === '' || v === false) continue;
    switch (field.kind) {
      case 'bool':
        out[field.key] = true;
        break;
      case 'int':
      case 'money': {
        const n = parseAmount(String(v));
        if (n !== null) out[field.key] = n;
        break;
      }
      case 'datetime': {
        const iso = localInputToIso(String(v));
        if (iso) out[field.key] = iso;
        break;
      }
      default: {
        const s = String(v).trim();
        if (s) out[field.key] = s;
      }
    }
  }
  return out;
}

/** Phần nội dung chung của CreateListingInput / UpdateListingInput (chưa có category, status, images, id). */
export function buildContent(category: ListingCategory, v: FormValues) {
  const feature = featureOfCategory(category);
  const withPrice = hasPrice(feature);
  return {
    title: v.title.trim(),
    description: v.description.trim() || null,
    // Việc làm / thất lạc không có ô giá: "thoả thuận" + null (giá hiển thị lấy từ lương / không có).
    price_type: withPrice ? v.price_type : ('negotiable' as const),
    price: withPrice && v.price_type === 'fixed' ? parseAmount(v.price) : null,
    attributes: cleanAttributes(category, v.attributes),
    site: v.site || null,
    address_text: v.address_text.trim() || null,
    lang: v.lang,
  };
}

/** Bước chứa một ô (path lỗi Zod: "title", "attributes.year", "images"…) để nhảy về đúng bước khi lỗi. */
export function stepOfField(path: string): FormStep {
  if (path === 'images') return 1;
  if (path === 'title' || path === 'description' || path === 'price' || path === 'price_type') return 2;
  return 3;
}
