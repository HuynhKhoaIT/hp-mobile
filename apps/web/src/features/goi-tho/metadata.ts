// Metadata của mini-app Gọi thợ: mọi trang noindex (yêu cầu có thông tin cá nhân của người đăng; trang chủ chưa cần SEO — kế hoạch
// Gọi thợ: "/goi-tho công khai nhưng noindex"). Tiêu đề "{trang} – Gọi thợ".
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export type GoiThoPage = 'home' | 'request' | 'form' | 'mine' | 'chat';

export async function goiThoMetadata(page: GoiThoPage): Promise<Metadata> {
  const t = await getTranslations('tho');
  const sub: Record<GoiThoPage, string | null> = {
    home: null,
    request: t('detail.title'),
    form: t('form.title_new'),
    mine: t('mine.title'),
    chat: t('tabs.chat'),
  };
  const pageTitle = sub[page];
  return {
    title: pageTitle ? `${pageTitle} – ${t('title')}` : t('title'),
    description: t('subtitle'),
    robots: { index: false, follow: false },
  };
}
