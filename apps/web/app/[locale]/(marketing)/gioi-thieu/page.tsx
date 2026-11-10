// /gioi-thieu — landing marketing (`/` là Hub). Khối và dữ liệu ở features/marketing/components/landing-page.tsx.
import { APP_NAME } from '@hp/shared';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { asLocale } from '@/features/listing/display';
import { LandingPage } from '@/features/marketing/components/landing-page';
import { localeAlternates } from '@/i18n/alternates';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('web.marketing');
  const locale = asLocale(await getLocale());
  const title = t('meta_title', { appName: APP_NAME });
  const description = t('meta_description');
  return {
    title: { absolute: title },
    description,
    alternates: localeAlternates('/gioi-thieu', locale),
    openGraph: { type: 'website', siteName: APP_NAME, title, description, locale },
  };
}

export default function Page() {
  return <LandingPage />;
}
