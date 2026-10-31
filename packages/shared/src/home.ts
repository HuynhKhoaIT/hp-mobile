// Cấu hình trang chủ (Hub) dùng chung app và web — docs/design/home.md §4.3, §4.6. Thứ tự / nội dung đổi ở đây thì
// hai nền tảng đổi theo. Icon, màu, đường dẫn là việc của từng nền tảng (map theo `id` / `feature`).
// Chỉ import type: file được node --test chạy trực tiếp.
import type { Feature, ListingCategory, ListingFeature } from './enums';

export type HomeTile =
  | { id: Feature; kind: 'service'; soon?: boolean; isNew?: boolean }
  | { id: 'my_listings' | 'all'; kind: 'utility'; isNew?: boolean };

/** 8 ô lưới dịch vụ (4 × 2 trên điện thoại). Nhãn: service → `common.feature.<id>`, utility → `common.home.tiles.<id>`. */
export const HOME_TILES: readonly HomeTile[] = [
  { id: 'pass', kind: 'service' },
  { id: 'room', kind: 'service' },
  { id: 'job', kind: 'service' },
  { id: 'lostFound', kind: 'service' },
  { id: 'ride', kind: 'service', soon: true },
  { id: 'sport', kind: 'service', soon: true },
  { id: 'my_listings', kind: 'utility' },
  { id: 'all', kind: 'utility' },
];

export type HomeShortcut = {
  id: string;
  feature: ListingFeature;
  categories: readonly ListingCategory[];
  /** Lọc thêm theo listings.attributes (jsonb containment) — khoá / giá trị khớp ATTRIBUTE_FIELDS. */
  attributes?: Readonly<Record<string, string | number | boolean>>;
};

/** Chip "Tìm nhanh". Nhãn: `common.home.shortcut.<id>`. Bấm → danh sách của `feature` với bộ lọc này. */
export const HOME_SHORTCUTS: readonly HomeShortcut[] = [
  { id: 'motorbike', feature: 'pass', categories: ['pass_vehicle'], attributes: { vehicle_type: 'motorbike' } },
  { id: 'electronics', feature: 'pass', categories: ['pass_electronics'] },
  { id: 'ppe', feature: 'pass', categories: ['pass_ppe'] },
  { id: 'home_goods', feature: 'pass', categories: ['pass_home'] },
  { id: 'room_loft', feature: 'room', categories: ['room_rent'], attributes: { has_loft: true } },
  { id: 'room_share', feature: 'room', categories: ['room_share'] },
  { id: 'night_shift', feature: 'job', categories: ['job_main', 'job_parttime'], attributes: { shift: 'night' } },
  { id: 'parttime', feature: 'job', categories: ['job_parttime'] },
  { id: 'found', feature: 'lostFound', categories: ['found'] },
];

/** Số tin mỗi dải trên Hub. */
export const HOME_RAIL_SIZE = { near: 10, forYou: 10, feature: 8 } as const;

/** "Chào An": tên gọi tiếng Việt là từ cuối của họ tên; tên một từ / tên nước ngoài giữ nguyên từ cuối. */
export function givenName(fullName: string | null | undefined): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.at(-1) ?? '';
}
