// searchParams của trang admin (thuần, dùng ở server lẫn client): đọc chuỗi, dựng href giữ bộ lọc trên URL.
// Bộ lọc / trang / sắp xếp luôn nằm trên URL → chia sẻ / tải lại giữ nguyên; đổi bộ lọc thì về trang 1.

export type SearchParams = Record<string, string | string[] | undefined>;
export type Query = Record<string, string>;

/** Giá trị chuỗi (bỏ mảng / rỗng). */
export function pick(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

/** Chỉ giữ các khoá cho phép, bỏ giá trị rỗng. */
export function pickQuery(params: SearchParams, keys: readonly string[]): Query {
  const out: Query = {};
  for (const k of keys) {
    const v = pick(params, k);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function pageOf(params: SearchParams): number {
  const n = Number(pick(params, 'page'));
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/**
 * Href next-intl `{ pathname, query }`: ghép `patch` vào query hiện tại; giá trị null / '' xoá khoá.
 * Mặc định bỏ `page` (đổi bộ lọc → trang 1) trừ khi patch đặt page.
 */
export function hrefWith(pathname: string, query: Query, patch: Record<string, string | number | null | undefined> = {}) {
  const next: Query = { ...query };
  if (!('page' in patch)) delete next.page;
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '' || (k === 'page' && Number(v) <= 1)) delete next[k];
    else next[k] = String(v);
  }
  return { pathname, query: next };
}
