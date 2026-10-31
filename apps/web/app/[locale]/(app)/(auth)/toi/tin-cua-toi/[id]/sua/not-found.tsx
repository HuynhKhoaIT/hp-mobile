// Tin không có / không phải của tôi / đã xoá.
import { SearchX } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('listing');
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-12">
      <EmptyState
        icon={SearchX}
        title={t('detail.not_found_title')}
        action={
          <Button asChild>
            <Link href="/toi/tin-cua-toi">{t('form.my_listings')}</Link>
          </Button>
        }
      />
    </section>
  );
}
