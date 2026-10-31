// Trang chủ (/) — Hub kiểu super app (docs/design/home.md): header xanh + tìm kiếm dính, lưới 8 dịch vụ, banner,
// thẻ cá nhân, tìm nhanh, dải "Gần {khu}" / "Dành cho bạn" / theo dịch vụ, cộng đồng + an toàn (features/home).
// Nằm trong khu (app) để có thanh điều hướng dưới như app. Prerender tĩnh; phần theo người dùng đọc ở trình duyệt.
import { APP_NAME } from '@hp/shared';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { HomePage } from '@/features/home/components/home-page';
import { asLocale } from '@/features/listing/display';
import { localeAlternates } from '@/i18n/alternates';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('web');
  const locale = asLocale(await getLocale());
  const description = t('meta.description');
  return {
    title: { absolute: t('home.heading', { appName: APP_NAME }) },
    description,
    alternates: localeAlternates('/', locale),
    openGraph: { type: 'website', siteName: APP_NAME, title: APP_NAME, description, locale },
  };
}

export default function Page() {
  return <HomePage />;
}
