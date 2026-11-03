// Bộ lọc danh sách nhóm trên URL: ?sub=<sub_kind>&when=today|tomorrow|week&q=<từ khoá>&full=1. Kiểm bằng GroupFilters
// (@hp/shared); giá trị sai / không thuộc kind → bỏ qua (không báo lỗi, không 404). Không phụ thuộc React — dùng ở server
// và client ("Xem thêm").
import { GROUP_SUB_KINDS, GroupFilters, type GroupKind, type GroupSubKind, type GroupTimeWindow } from '@hp/shared';

export type GroupFilterState = {
  /** Loại con đang chọn (một chip) hoặc null = tất cả. */
  sub: GroupSubKind | null;
  when: GroupTimeWindow | null;
  query: string;
  /** Hiện cả nhóm đã đủ người. */
  includeFull: boolean;
};

export const NO_GROUP_FILTERS: GroupFilterState = { sub: null, when: null, query: '', includeFull: false };

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseGroupFilters(raw: RawParams, kind: GroupKind): GroupFilterState {
  const rawSub = first(raw.sub);
  const sub =
    rawSub &&
    (GROUP_SUB_KINDS[kind] as readonly string[]).includes(rawSub) &&
    GroupFilters.safeParse({ subKinds: [rawSub] }).success
      ? (rawSub as GroupSubKind)
      : null;
  const w = GroupFilters.safeParse({ when: first(raw.when) });
  const q = GroupFilters.safeParse({ query: first(raw.q) ?? '' });
  const full = first(raw.full);
  return {
    sub,
    when: w.success ? (w.data.when ?? null) : null,
    query: q.success ? (q.data.query ?? '') : '',
    includeFull: full === '1' || full === 'true',
  };
}

/** Số tham số lọc đang dùng (robots noindex khi > 2 hoặc có từ khoá). */
export function groupFilterCount(f: GroupFilterState): number {
  return [f.sub, f.when, f.query, f.includeFull].filter(Boolean).length;
}

/** Query string cho Link / canonical / form (bỏ trường rỗng). Thứ tự cố định để URL ổn định. */
export function groupFilterQuery(f: Partial<GroupFilterState>): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.sub) out.sub = f.sub;
  if (f.when) out.when = f.when;
  if (f.query) out.q = f.query;
  if (f.includeFull) out.full = '1';
  return out;
}

/** State → bộ lọc của searchGroups (@hp/core). */
export function toGroupFilters(f: GroupFilterState): GroupFilters {
  return {
    ...(f.sub ? { subKinds: [f.sub] } : {}),
    ...(f.when ? { when: f.when } : {}),
    ...(f.query ? { query: f.query } : {}),
    ...(f.includeFull ? { includeFull: true } : {}),
  };
}
