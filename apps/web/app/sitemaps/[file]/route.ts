// /sitemaps/static.xml và /sitemaps/listings-{n}.xml — các file con của /sitemap.xml (src/features/seo/sitemap.ts).
import { listingSitemapXml, staticSitemapXml, xmlResponse } from '@/features/seo/sitemap';

export async function GET(_request: Request, ctx: RouteContext<'/sitemaps/[file]'>) {
  const { file } = await ctx.params;
  if (file === 'static.xml') return xmlResponse(staticSitemapXml());
  const match = /^listings-(\d{1,4})\.xml$/.exec(file);
  const xml = match ? await listingSitemapXml(Number(match[1])) : null;
  return xml ? xmlResponse(xml) : new Response(null, { status: 404 });
}
