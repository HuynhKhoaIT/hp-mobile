// /sitemap.xml — sitemap index (tĩnh + tin theo trang 10.000). Next không có sitemap index sẵn → route handler; xem
// src/features/seo/sitemap.ts.
import { sitemapIndexXml, xmlResponse } from '@/features/seo/sitemap';

export async function GET() {
  return xmlResponse(await sitemapIndexXml());
}
