// Mô tả trường `attributes` theo category — một nguồn cho: Zod (validate), trang chi tiết (hiện bảng thông số),
// form đăng tin (tuần 4). Nhãn: i18n `listing.attr.<key>`; giá trị enum: `listing.attr_value.<key>.<value>`.
// Hợp đồng với cột listings.attributes (supabase/CLAUDE.md mục 4) và moderate-listing: đổi key → migration backfill.
import type { ListingCategory } from '../../enums';

export const CONDITIONS = ['new', 'like_new', 'used'] as const;
export const VEHICLE_TYPES = ['motorbike', 'car', 'bicycle'] as const;
export const PPE_ITEM_TYPES = ['boots', 'helmet', 'uniform', 'gloves'] as const;
export const SHIFTS = ['day', 'night', 'rotating'] as const;
export const PAY_TYPES = ['hour', 'day', 'month'] as const;
export const LOST_ITEM_TYPES = ['wallet', 'phone', 'keys', 'card', 'bag', 'other'] as const;

export type AttributeField =
  | { key: string; kind: 'enum'; options: readonly string[] }
  | { key: string; kind: 'int'; unit?: 'm2' | 'km' | 'months' | 'people' | 'year' }
  | { key: string; kind: 'money'; per?: 'kwh' | 'month' | 'hour' | 'day' }
  | { key: string; kind: 'bool' }
  | { key: string; kind: 'text' }
  | { key: string; kind: 'datetime' };

const PASS_ELECTRONICS: AttributeField[] = [
  { key: 'brand', kind: 'text' },
  { key: 'model', kind: 'text' },
  { key: 'condition', kind: 'enum', options: CONDITIONS },
  { key: 'warranty_months', kind: 'int', unit: 'months' },
];
const PASS_VEHICLE: AttributeField[] = [
  { key: 'vehicle_type', kind: 'enum', options: VEHICLE_TYPES },
  { key: 'brand', kind: 'text' },
  { key: 'year', kind: 'int', unit: 'year' },
  { key: 'odometer_km', kind: 'int', unit: 'km' },
  { key: 'plate_prefix', kind: 'text' },
];
const PASS_PPE: AttributeField[] = [
  { key: 'item_type', kind: 'enum', options: PPE_ITEM_TYPES },
  { key: 'size', kind: 'text' },
  { key: 'condition', kind: 'enum', options: CONDITIONS },
];
const PASS_HOME: AttributeField[] = [{ key: 'condition', kind: 'enum', options: CONDITIONS }];
const ROOM: AttributeField[] = [
  { key: 'area_m2', kind: 'int', unit: 'm2' },
  { key: 'electricity_price', kind: 'money', per: 'kwh' },
  { key: 'water_price', kind: 'money' },
  { key: 'has_loft', kind: 'bool' },
  { key: 'has_parking', kind: 'bool' },
  { key: 'curfew', kind: 'text' },
  { key: 'max_people', kind: 'int', unit: 'people' },
];
const JOB: AttributeField[] = [
  { key: 'shift', kind: 'enum', options: SHIFTS },
  { key: 'salary_min', kind: 'money' },
  { key: 'salary_max', kind: 'money' },
  { key: 'pay_type', kind: 'enum', options: PAY_TYPES },
  { key: 'requirements', kind: 'text' },
  { key: 'contact_name', kind: 'text' },
];
const LOST_FOUND: AttributeField[] = [
  { key: 'item_type', kind: 'enum', options: LOST_ITEM_TYPES },
  { key: 'lost_at', kind: 'datetime' },
  { key: 'place', kind: 'text' },
  { key: 'identifying_marks', kind: 'text' },
  { key: 'returned', kind: 'bool' },
];

export const ATTRIBUTE_FIELDS: Record<ListingCategory, readonly AttributeField[]> = {
  pass_electronics: PASS_ELECTRONICS,
  pass_vehicle: PASS_VEHICLE,
  pass_ppe: PASS_PPE,
  pass_home: PASS_HOME,
  room_rent: ROOM,
  room_share: ROOM,
  job_main: JOB,
  job_parttime: JOB,
  lost: LOST_FOUND,
  found: LOST_FOUND,
};

// ── Form đăng tin: chia thông số theo bước (app + web) ───────────────────────────────────────────────────────────

/** Bước form đăng tin sau khi chọn danh mục: 1 ảnh · 2 thông tin chính · 3 chi tiết. */
export type ListingFormStep = 1 | 2 | 3;

/** Phần `form` của config tính năng quyết định thông số nằm ở bước nào. */
export type AttributeFormLayout = {
  /** Khoá hiện ở bước 2 (theo thứ tự này) thay vì bước 3; khoá không có trong category bị bỏ qua. */
  primaryAttributes?: readonly string[];
  /** Khoá không hiện trong form (vd `returned` của đồ thất lạc); giá trị cũ vẫn giữ khi sửa. */
  hiddenAttributes?: readonly string[];
};

/** Chia ATTRIBUTE_FIELDS[category]: bước 2 (theo thứ tự primaryAttributes) · bước 3 (còn lại), bỏ trường ẩn. */
export function splitAttributeFields(
  category: ListingCategory,
  layout: AttributeFormLayout | undefined,
): { primary: AttributeField[]; details: AttributeField[] } {
  const all = ATTRIBUTE_FIELDS[category];
  const hidden = new Set(layout?.hiddenAttributes ?? []);
  const primary = (layout?.primaryAttributes ?? [])
    .filter((k) => !hidden.has(k))
    .map((k) => all.find((f) => f.key === k))
    .filter((f): f is AttributeField => f !== undefined);
  const taken = new Set(primary.map((f) => f.key));
  return { primary, details: all.filter((f) => !taken.has(f.key) && !hidden.has(f.key)) };
}

const STEP_OF_FIELD: Readonly<Record<string, ListingFormStep>> = { images: 1, title: 2, description: 2, price: 2, price_type: 2 };

/**
 * Bước chứa một ô theo path lỗi Zod / form ("title", "images", "images.0", "attributes.year") để nhảy về đúng bước khi
 * lỗi. `primary`: khoá thông số nằm ở bước 2 (splitAttributeFields(...).primary).
 */
export function listingFormStepOf(path: string, primary: ReadonlySet<string> = new Set()): ListingFormStep {
  const [head = '', key = ''] = path.split('.');
  if (head === 'attributes' && primary.has(key)) return 2;
  return STEP_OF_FIELD[head] ?? 3;
}
