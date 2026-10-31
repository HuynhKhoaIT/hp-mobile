// Không tìm thấy trang (trong phạm vi một ngôn ngữ).
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-fg">{t('errors.not_found')}</h1>
      <Button asChild>
        <Link href="/">{t('web.header.home')}</Link>
      </Button>
    </section>
  );
}
