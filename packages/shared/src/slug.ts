// Slug cho URL tenapp.vn/tin/{slug}-{short_id}. Phải cho cùng kết quả với SQL public.slugify()
// (supabase/migrations/20261030090000_extensions_helpers.sql). Hai bên dùng chung bộ ví dụ trong slug.test.ts
// và supabase/tests/000_foundation.test.sql — sửa một bên thì sửa cả hai.

const MAX_LENGTH = 80;
const FALLBACK = 'tin';

export function toSlug(text: string): string {
  const slug = text
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/^-+|-+$/g, '');
  return slug || FALLBACK;
}

export function buildSlug(title: string, shortId: string): string {
  return `${toSlug(title)}-${shortId}`;
}

/** Lấy short_id (đoạn cuối sau dấu '-') từ slug trên URL. Trả null nếu không hợp lệ. */
export function parseShortId(slug: string): string | null {
  const match = /-([0-9a-z]{6})$/.exec(slug);
  return match?.[1] ?? null;
}
