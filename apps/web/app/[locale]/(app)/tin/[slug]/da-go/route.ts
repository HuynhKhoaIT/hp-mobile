// /tin/[slug]/da-go — 410 Gone cho tin thôi hiện > 30 ngày (page /tin/[slug] chuyển tới đây). Xem features/listing/gone.ts.
import { asLocale } from '@/features/listing/display';
import { listingGoneResponse } from '@/features/listing/gone';

export async function GET(request: Request, ctx: RouteContext<'/[locale]/tin/[slug]/da-go'>) {
  const { locale, slug } = await ctx.params;
  return listingGoneResponse(slug, asLocale(locale), request.url);
}
