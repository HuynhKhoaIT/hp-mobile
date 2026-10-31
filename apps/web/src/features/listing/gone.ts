// 410 Gone cho tin thôi hiện > 30 ngày (.claude/rules/web-seo-public.md: "route handler set status, không notFound() 404").
// /tin/[slug] chuyển (307) tới /tin/[slug]/da-go khi isListingGone → route handler gọi hàm này.
// HTML tối giản, đủ 3 ngôn ngữ (chữ qua next-intl), noindex; không có dữ liệu người dùng (không tiêu đề tin) để khỏi phải
// escape nội dung tự do. Tin đã mở lại (không còn "gone") → chuyển về trang tin; không có → 404.
import 'server-only';
import { isListingGone } from '@hp/core';
import type { Locale } from '@hp/shared';
import { getTranslations } from 'next-intl/server';
import { withLocale } from '@/i18n/paths';
import { configOfCategory } from './features';
import { getListingPage } from './queries';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

export async function listingGoneResponse(slug: string, locale: Locale, requestUrl: string): Promise<Response> {
  const { listing, now } = await getListingPage(slug);
  if (!listing) return new Response(null, { status: 404, headers: { 'X-Robots-Tag': 'noindex' } });
  if (!isListingGone(listing, new Date(now))) {
    return Response.redirect(new URL(withLocale(`/tin/${listing.slug}`, locale), requestUrl), 307);
  }

  const t = await getTranslations({ locale, namespace: 'listing' });
  const tw = await getTranslations({ locale, namespace: 'web.listing' });
  const title = escapeHtml(t('detail.not_found_title'));
  const body = escapeHtml(t('detail.not_found_body'));
  const back = escapeHtml(t('detail.back_to_list'));
  const all = escapeHtml(tw('all.title'));
  const listPath = withLocale(configOfCategory(listing.category).path, locale);
  const allPath = withLocale('/tin', locale);

  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<title>${title}</title>
</head>
<body>
<main>
<h1>${title}</h1>
<p>${body}</p>
<ul>
<li><a href="${listPath}">${back}</a></li>
<li><a href="${allPath}">${all}</a></li>
</ul>
</main>
</body>
</html>`;

  return new Response(html, {
    status: 410,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
