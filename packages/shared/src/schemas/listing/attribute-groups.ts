// Nhóm thông số ở trang chi tiết tin (app + web, style Stitch "Chi tiết phòng trọ" / "Chi tiết việc làm"): một số khoá
// tách khỏi lưới "Thông tin" chung thành khối có tiêu đề riêng — trọ: Chi phí (điện, nước, wifi, rác, tháng cọc) · Tiện
// nghi (gác, điều hoà, WC riêng, bếp, wifi, camera, chỗ để xe, giờ tự do, không chung chủ) · Nội quy (giờ giấc, số người);
// việc làm: Người phụ trách (tên — SĐT vẫn chỉ lộ qua reveal_contact) · Yêu cầu (đoạn chữ). Khoá còn lại ở lưới chung.
// Tiêu đề khối: i18n `listing.attr_group.<key>`. Category không có nhóm → mọi thông số ở lưới chung.
// Chỉ import type: file được node --test chạy trực tiếp (không phân giải import thiếu đuôi).
import type { ListingCategory } from '../../enums';

export type AttributeGroupKey = 'costs' | 'amenities' | 'rules' | 'contact' | 'requirements';

export type AttributeGroup = {
  key: AttributeGroupKey;
  /** Khoá ATTRIBUTE_FIELDS trong khối (theo thứ tự hiển thị). */
  keys: readonly string[];
  /** `grid`: ô icon + nhãn + giá trị như lưới chung; `text`: đoạn chữ dài (giá trị text) trong một thẻ. */
  layout: 'grid' | 'text';
};

const ROOM: readonly AttributeGroup[] = [
  { key: 'costs', keys: ['electricity_price', 'water_price', 'wifi_price', 'trash_price', 'deposit_months'], layout: 'grid' },
  {
    key: 'amenities',
    keys: ['has_loft', 'has_ac', 'private_wc', 'has_kitchen', 'has_wifi', 'has_camera', 'has_parking', 'free_hours', 'no_landlord'],
    layout: 'grid',
  },
  { key: 'rules', keys: ['curfew', 'max_people'], layout: 'grid' },
];
const JOB: readonly AttributeGroup[] = [
  { key: 'contact', keys: ['contact_name'], layout: 'grid' },
  { key: 'requirements', keys: ['requirements'], layout: 'text' },
];

export const ATTRIBUTE_GROUPS: Partial<Record<ListingCategory, readonly AttributeGroup[]>> = {
  room_rent: ROOM,
  room_share: ROOM,
  room_house: ROOM,
  room_apartment: ROOM,
  job_main: JOB,
  job_parttime: JOB,
};

/**
 * Chia các dòng readAttributes thành lưới chung + khối theo ATTRIBUTE_GROUPS[category]. Khối không có giá trị nào bị bỏ;
 * dòng trong khối theo thứ tự `keys`; lưới chung giữ thứ tự gốc.
 */
export function groupAttributeRows<R extends { field: { key: string } }>(
  category: ListingCategory,
  rows: readonly R[],
): { general: R[]; groups: (Omit<AttributeGroup, 'keys'> & { rows: R[] })[] } {
  const defs = ATTRIBUTE_GROUPS[category] ?? [];
  const byKey = new Map(rows.map((r) => [r.field.key, r]));
  const taken = new Set<string>();
  const groups = defs
    .map(({ key, keys, layout }) => {
      const picked = keys.map((k) => byKey.get(k)).filter((r): r is R => r !== undefined);
      for (const r of picked) taken.add(r.field.key);
      return { key, layout, rows: picked };
    })
    .filter((g) => g.rows.length > 0);
  return { general: rows.filter((r) => !taken.has(r.field.key)), groups };
}
