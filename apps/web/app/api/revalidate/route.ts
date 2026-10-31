// POST /api/revalidate — webhook DB (trigger listings → app_settings.web_revalidate_url) làm mới cache web khi tin đổi
// (đăng / sửa / đổi trạng thái từ app, admin, cron hết hạn). Body: {"tags": ["listing:<uuid>", "listings"]}.
// Header `x-revalidate-secret` so khớp REVALIDATE_SECRET theo thời gian hằng (băm SHA-256 hai phía để cùng độ dài).
// Chỉ nhận tag `listings`, `banners` hoặc `listing:<uuid>` (tối đa 20). 401 sai secret · 400 body sai · 200 { revalidated }.
// - `listing:<id>`: { expire: 0 } — trang chi tiết đọc lại ngay ở request kế tiếp (tin vừa bán / bị gỡ không còn hiện cũ).
// - `listings`: 'max' — danh sách / sitemap phục vụ bản cũ một lần trong khi làm mới nền (stale-while-revalidate).
import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';

const TAG = /^(listings|banners|listing:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const MAX_TAGS = 20;

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

function secretMatches(given: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function parseTags(body: unknown): string[] | null {
  if (!body || typeof body !== 'object' || !('tags' in body)) return null;
  const tags = (body as { tags: unknown }).tags;
  if (!Array.isArray(tags) || tags.length === 0 || tags.length > MAX_TAGS) return null;
  if (!tags.every((t): t is string => typeof t === 'string' && TAG.test(t))) return null;
  return [...new Set(tags)];
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get('x-revalidate-secret'))) return json({ error: 'unauthorized' }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_input' }, 400);
  }
  const tags = parseTags(body);
  if (!tags) return json({ error: 'invalid_input' }, 400);

  for (const tag of tags) revalidateTag(tag, tag === 'listings' ? 'max' : { expire: 0 });
  return json({ revalidated: tags }, 200);
}
