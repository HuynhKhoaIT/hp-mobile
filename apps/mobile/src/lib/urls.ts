// Link trang web (pháp lý, chia sẻ) theo ngôn ngữ đang dùng: vi không tiền tố, /en, /zh — khớp routing của web.
import { getLocale } from '@/core/i18n';
import { env } from '@/core/env';

export type WebPage = '/dieu-khoan' | '/chinh-sach-bao-mat' | '/xoa-tai-khoan' | '/gioi-thieu' | '/lien-he';

export function webPageUrl(page: WebPage): string {
  const locale = getLocale();
  return `${env.webUrl}${locale === 'vi' ? '' : `/${locale}`}${page}`;
}
