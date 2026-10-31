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
