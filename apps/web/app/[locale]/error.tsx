'use client';

// Lỗi không lường trước trong một trang: thông báo chung + nút thử lại (reset).
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-fg">{t('errors.unknown')}</h1>
      <Button onClick={reset}>{t('common.actions.retry')}</Button>
    </section>
  );
}
