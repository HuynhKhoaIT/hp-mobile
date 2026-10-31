// Link trang web (pháp lý, chia sẻ) theo ngôn ngữ đang dùng: vi không tiền tố, /en, /zh — khớp routing của web.
import { shareUrl } from '@hp/core';
import { getLocale } from '@/core/i18n';
import { env } from '@/core/env';

/** Link chia sẻ tin: luôn URL web `https://tenapp.vn/tin/{slug}` (không tiền tố ngôn ngữ, không scheme hoaphat://). */
export function listingShareUrl(slug: string): string {
  return shareUrl({ type: 'listing', slug }, env.webUrl);
}

export type WebPage = '/dieu-khoan' | '/chinh-sach-bao-mat' | '/xoa-tai-khoan' | '/gioi-thieu' | '/lien-he';

export function webPageUrl(page: WebPage): string {
  const locale = getLocale();
  return `${env.webUrl}${locale === 'vi' ? '' : `/${locale}`}${page}`;
}
