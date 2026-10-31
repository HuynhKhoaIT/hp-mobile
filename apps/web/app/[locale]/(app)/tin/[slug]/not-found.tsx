// Tin không có / đã gỡ / hết hạn / link sai: 404 + đường về danh sách.
import { SearchX } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function ListingNotFound() {
  const t = await getTranslations('listing.detail');
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-12">
      <h1 className="sr-only">{t('not_found_title')}</h1>
      <EmptyState
        icon={SearchX}
        title={t('not_found_title')}
        description={t('not_found_body')}
        action={
          <Button asChild>
            <Link href="/tin">{t('back_to_list')}</Link>
          </Button>
        }
      />
    </section>
  );
}
