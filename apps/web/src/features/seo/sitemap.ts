// Sitemap (.claude/rules/web-seo-public.md). Next không tự sinh sitemap index (generateSitemaps chỉ chia file) → tự dựng XML:
//   /sitemap.xml                 sitemap index: /sitemaps/static.xml + /sitemaps/listings-{n}.xml
//   /sitemaps/static.xml         trang công khai tĩnh × 3 ngôn ngữ (xhtml:link hreflang + x-default)
//   /sitemaps/listings-{n}.xml   tin đang hiện, 10.000 / file (RPC sitemap_listings, n bắt đầu từ 1), số file =
//                                ceil(public_stats().listings / 10.000). Chỉ URL tiếng Việt (canonical mặc định);
//                                bản en / zh khai báo bằng hreflang trong <head> của trang tin.
// Không có /admin, khu đăng nhập, /u/[id], /tim-kiem. Dữ liệu cache 1 giờ + tag `listings` (webhook làm mới).
import 'server-only';
import { LOCALES } from '@hp/shared';
import { absoluteUrl } from '@/i18n/alternates';
import { routing } from '@/i18n/routing';
import { publicEnv } from '@/lib/env';
import { getPublicStats, getSitemapListings, SITEMAP_PAGE_SIZE } from '../listing/queries';

/** Trang công khai tĩnh (đổi route → sửa ở đây). Trang khu vực /tro/[site]… thêm khi có. */
const STATIC_PATHS = [
  '/',
  '/tin',
  '/pass-do',
  '/tro',
  '/viec-lam',
  '/that-lac',
  '/gioi-thieu',
  '/lien-he',
  '/dieu-khoan',
  '/chinh-sach-bao-mat',
  '/xoa-tai-khoan',
] as const;

const XML_HEADERS = { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const base = () => publicEnv.siteUrl.replace(/\/+$/, '');

export const xmlResponse = (xml: string) => new Response(xml, { headers: XML_HEADERS });

/** Số file sitemap tin (≥ 1). Lỗi đọc số liệu → 1 file (vẫn có tin mới nhất). */
async function listingSitemapCount(): Promise<number> {
  try {
    const stats = await getPublicStats();
    return Math.max(1, Math.ceil(Number(stats.listings) / SITEMAP_PAGE_SIZE));
  } catch {
    return 1;
  }
}

export async function sitemapIndexXml(): Promise<string> {
  const count = await listingSitemapCount();
  const files = ['static.xml', ...Array.from({ length: count }, (_, i) => `listings-${i + 1}.xml`)];
  const items = files.map((f) => `<sitemap><loc>${esc(`${base()}/sitemaps/${f}`)}</loc></sitemap>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>`;
}

export function staticSitemapXml(): string {
  const urls = STATIC_PATHS.flatMap((path) =>
    LOCALES.map((locale) => {
      const links = [
        ...LOCALES.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(absoluteUrl(path, l))}"/>`),
        `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(absoluteUrl(path, routing.defaultLocale))}"/>`,
      ].join('');
      return `<url><loc>${esc(absoluteUrl(path, locale))}</loc>${links}</url>`;
    }),
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;
}

/** File sitemap tin thứ `page` (1 = mới nhất). null = số trang không hợp lệ. */
export async function listingSitemapXml(page: number): Promise<string | null> {
  if (!Number.isInteger(page) || page < 1 || page > 1000) return null;
  const rows = await getSitemapListings(page);
  if (rows.length === 0 && page > 1) return null;
  const urls = rows
    .map((r) => `<url><loc>${esc(absoluteUrl(`/tin/${r.slug}`, routing.defaultLocale))}</loc><lastmod>${esc(r.updated_at)}</lastmod></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
