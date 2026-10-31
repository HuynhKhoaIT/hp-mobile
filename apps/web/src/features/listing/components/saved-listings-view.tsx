// Tin đã lưu: lưới thẻ tin (giống danh sách công khai). Đọc theo request (cookie phiên) → trong <Suspense> của page.
import { Heart } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getSavedListingsPage } from '../queries';
import { ListingGrid } from './listing-grid';

export async function SavedListingsView() {
  const t = await getTranslations();
  const { result, now } = await getSavedListingsPage();

  if (result.error) {
    return (
      <EmptyState
        title={t('common.states.error_title')}
        description={t.has(`errors.${result.error.code}`) ? t(`errors.${result.error.code}`) : t('errors.unknown')}
        action={
          <Button asChild variant="outline">
            <Link href="/toi/da-luu">{t('common.actions.retry')}</Link>
          </Button>
        }
      />
    );
  }
  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title={t('listing.saved.empty_title')}
        description={t('listing.saved.empty_body')}
        action={
          <Button asChild>
            <Link href="/tin">{t('listing.hub.see_all')}</Link>
          </Button>
        }
      />
    );
  }
  return <ListingGrid items={result.data} now={now} />;
}
