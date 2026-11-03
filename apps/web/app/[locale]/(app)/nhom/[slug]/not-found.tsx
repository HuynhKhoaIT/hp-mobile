// Nhóm không có / đã xoá / link sai: 404 + đường về danh sách nhóm.
import { SearchX } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function GroupNotFound() {
  const t = await getTranslations();
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-12">
      <h1 className="sr-only">{t('group.detail.not_found_title')}</h1>
      <EmptyState
        icon={SearchX}
        title={t('group.detail.not_found_title')}
        description={t('group.detail.not_found_body')}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/ghep-xe">{t('common.feature.ride')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ghep-tran">{t('common.feature.sport')}</Link>
            </Button>
          </div>
        }
      />
    </section>
  );
}
