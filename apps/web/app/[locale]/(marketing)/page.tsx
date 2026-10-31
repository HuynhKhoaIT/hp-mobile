// Trang chủ tạm của tuần 1. Tuần 2 chuyển sang (marketing)/page.tsx; landing đầy đủ ở tuần 11.
import { APP_NAME } from '@hp/shared';
import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('web.home');
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold text-fg">{APP_NAME}</h1>
      <p className="max-w-xl text-lg text-muted">{t('tagline')}</p>
      <p className="rounded-full bg-primary-light px-4 py-2 text-sm font-medium text-primary">{t('coming_soon')}</p>
    </section>
  );
}
